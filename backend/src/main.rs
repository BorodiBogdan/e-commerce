use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use std::sync::Arc;
use rand::Rng;
use models::{Product, CreateProductRequest, ProductQuery};
use actix_web::ResponseError;
use actix_multipart::Multipart;
use futures::StreamExt;
use std::path::Path;
use std::fs;
use std::io::Write;
use actix_web::web::Bytes;
use std::path::PathBuf;
use tokio::time::{sleep, Duration};
use tokio::sync::broadcast;
use std::sync::atomic::{AtomicBool, Ordering};
use actix_web_actors::ws;
use actix::{Actor, StreamHandler, Handler, AsyncContext, Message};
use actix_web_actors::ws::WebsocketContext;
use bytestring::ByteString;
use sqlx::sqlite::SqlitePoolOptions;
use dotenv::dotenv;
use std::env;

mod models;
mod validation;
#[cfg(test)]
mod tests;

// WebSocket actor
struct ProductWs {
    product_rx: broadcast::Receiver<Product>,
}

// Message wrapper for Product
struct ProductMessage(Product);

impl Message for ProductMessage {
    type Result = ();
}

impl Actor for ProductWs {
    type Context = WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("New WebSocket client connected: {:?}", ctx.address());
        
        // Start listening for new products
        let addr = ctx.address();
        let mut rx = self.product_rx.resubscribe();
        
        actix_rt::spawn(async move {
            while let Ok(product) = rx.recv().await {
                addr.do_send(ProductMessage(product));
            }
        });
    }

    fn stopping(&mut self, ctx: &mut Self::Context) -> actix::Running {
        println!("WebSocket client disconnected: {:?}", ctx.address());
        actix::Running::Stop
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for ProductWs {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Text(text)) => ctx.text(text),
            Ok(ws::Message::Binary(bin)) => ctx.binary(bin),
            _ => (),
        }
    }
}

impl Handler<ProductMessage> for ProductWs {
    type Result = ();

    fn handle(&mut self, msg: ProductMessage, ctx: &mut Self::Context) {
        ctx.text(ByteString::from(serde_json::to_string(&msg.0).unwrap()));
    }
}

// Global state to store WebSocket channels and database pool
pub struct AppState {
    is_generating: Arc<AtomicBool>,
    product_tx: broadcast::Sender<Product>,
    db_pool: sqlx::SqlitePool,
}

// Function to generate a random product
fn generate_random_product(id: i64) -> Product {
    let mut rng = rand::thread_rng();
    let categories = vec!["Electronics", "Books", "Clothing", "Home", "Toys"];
    let category = categories[rng.gen_range(0..categories.len())].to_string();

    Product {
        id,
        name: format!("Product-{}", id),
        price: rng.gen_range(10.0..500.0),
        image: Some(format!("/images/product-{}.jpg", id)),
        description: Some(format!("This is a description for Product-{}", id)),
        category: Some(category),
    }
}

// Function to generate products periodically
async fn generate_products_periodically(app_state: web::Data<AppState>) {
    while app_state.is_generating.load(Ordering::Relaxed) {
        let new_product = generate_random_product(rand::thread_rng().gen_range(1000..9999));
        
        // Insert into database
        let _ = sqlx::query!(
            r#"
            INSERT INTO products (name, price, image, description, category)
            VALUES (?, ?, ?, ?, ?)
            "#,
            new_product.name,
            new_product.price,
            new_product.image,
            new_product.description,
            new_product.category
        )
        .execute(&app_state.db_pool)
        .await;
        
        // Broadcast the new product to all connected WebSocket clients
        let _ = app_state.product_tx.send(new_product);
        
        println!("Generated a new product.");
        sleep(Duration::from_secs(3)).await;
    }
    println!("Stopped generating products.");
}

// WebSocket handler
async fn product_ws(
    req: actix_web::HttpRequest,
    stream: web::Payload,
    app_state: web::Data<AppState>,
) -> Result<HttpResponse, actix_web::Error> {
    let product_rx = app_state.product_tx.subscribe();
    let ws = ProductWs { product_rx };
    
    // Send initial products from database
    let products = sqlx::query_as!(
        Product,
        r#"SELECT id, name, price, image, description, category FROM products"#
    )
    .fetch_all(&app_state.db_pool)
    .await
    .unwrap_or_else(|_| vec![]);
    
    let _initial_msg = ws::Message::Text(ByteString::from(serde_json::to_string(&products).unwrap()));
    
    let resp = ws::start(ws, &req, stream)?;
    Ok(resp)
}

// API endpoint to toggle product generation
async fn toggle_generation(
    app_state: web::Data<AppState>,
    state: web::Json<bool>,
) -> impl Responder {
    app_state.is_generating.store(*state, Ordering::Relaxed);

    if *state {
        let app_state_clone = app_state.clone();
        tokio::spawn(async move {
            generate_products_periodically(app_state_clone).await;
        });
    }

    HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "is_generating": *state
    }))
}

async fn get_products(data: web::Data<AppState>, query: web::Query<ProductQuery>) -> impl Responder {
    let products = sqlx::query!(
        r#"SELECT id, name, price, image, description, category FROM products"#
    )
    .fetch_all(&data.db_pool)
    .await
    .unwrap_or_else(|_| vec![])
    .into_iter()
    .map(|row| Product {
        id: row.id,
        name: row.name,
        price: row.price,
        image: row.image,
        description: row.description,
        category: row.category,
    })
    .collect::<Vec<_>>();

    let filtered_products = filter_and_sort_products(&products, &query);

    // Apply pagination using offset and limit
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(6);
    let end_index = offset + limit;
    
    let paginated_products = if offset < filtered_products.len() {
        filtered_products[offset..std::cmp::min(end_index, filtered_products.len())].to_vec()
    } else {
        Vec::new()
    };

    HttpResponse::Ok().json(paginated_products)
}

async fn get_product(data: web::Data<AppState>, id: web::Path<i32>) -> impl Responder {
    let product_id = id.into_inner();
    
    match sqlx::query!(
        r#"SELECT id, name, price, image, description, category FROM products WHERE id = ?"#,
        product_id
    )
    .fetch_optional(&data.db_pool)
    .await
    {
        Ok(Some(row)) => {
            let product = Product {
                id: row.id,
                name: row.name,
                price: row.price,
                image: row.image,
                description: row.description,
                category: row.category,
            };
            HttpResponse::Ok().json(product)
        },
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Product not found"
        })),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Database error"
        }))
    }
}

async fn create_product(
    data: web::Data<AppState>,
    product: web::Json<CreateProductRequest>,
) -> impl Responder {
    if let Err(e) = validation::validate_product(&product) {
        return e.error_response();
    }

    match sqlx::query!(
        r#"
        INSERT INTO products (name, price, image, description, category)
        VALUES (?, ?, ?, ?, ?)
        "#,
        product.name,
        product.price,
        product.image,
        product.description,
        product.category
    )
    .execute(&data.db_pool)
    .await
    {
        Ok(result) => {
            let new_product = Product {
                id: result.last_insert_rowid(),
                name: product.name.clone(),
                price: product.price,
                image: product.image.clone(),
                description: product.description.clone(),
                category: Some(product.category.clone()),
            };
            HttpResponse::Created().json(new_product)
        },
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create product"
        }))
    }
}

async fn update_product(
    data: web::Data<AppState>,
    id: web::Path<i32>,
    product: web::Json<Product>,
) -> impl Responder {
    let product_id = id.into_inner();
    
    match sqlx::query!(
        r#"
        UPDATE products
        SET name = ?, price = ?, image = ?, description = ?, category = ?
        WHERE id = ?
        "#,
        product.name,
        product.price,
        product.image,
        product.description,
        product.category,
        product_id
    )
    .execute(&data.db_pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                HttpResponse::Ok().json(product.into_inner())
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Product not found"
                }))
            }
        },
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update product"
        }))
    }
}

async fn delete_product(data: web::Data<AppState>, id: web::Path<i32>) -> impl Responder {
    let product_id = id.into_inner();
    
    match sqlx::query!(
        r#"DELETE FROM products WHERE id = ?"#,
        product_id
    )
    .execute(&data.db_pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                HttpResponse::NoContent().finish()
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Product not found"
                }))
            }
        },
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to delete product"
        }))
    }
}

fn simulate_price_change(price: f64) -> f64 {
    let mut rng = rand::thread_rng();
    let change_percentage = rng.gen_range(-5.0..=5.0); // Random change between -5% and +5%
    price * (1.0 + change_percentage / 100.0)
}

fn filter_and_sort_products(products: &[Product], query: &ProductQuery) -> Vec<Product> {
    let mut filtered = products.to_vec();

    // Apply filters
    if let Some(category) = &query.category {
        filtered.retain(|p| p.category.as_ref().map_or(false, |c| c == category));
    }

    if let Some(min_price) = query.min_price {
        println!("Filtering by min_price: {}", min_price);
        let before_count = filtered.len();
        filtered.retain(|p| p.price >= min_price);
        println!("Products after min_price filter: {} -> {}", before_count, filtered.len());
    }

    if let Some(max_price) = query.max_price {
        println!("Filtering by max_price: {}", max_price);
        let before_count = filtered.len();
        filtered.retain(|p| p.price <= max_price);
        println!("Products after max_price filter: {} -> {}", before_count, filtered.len());
    }

    if let Some(search_term) = &query.search_term {
        let search_term = search_term.to_lowercase();
        filtered.retain(|p| {
            p.name.to_lowercase().contains(&search_term) ||
            p.description.as_ref().map_or(false, |d| d.to_lowercase().contains(&search_term)) ||
            p.category.as_ref().map_or(false, |c| c.to_lowercase().contains(&search_term))
        });
    }

    // Apply sorting
    if let Some(sort_by) = &query.sort_by {
        println!("Sorting by: {}, order: {:?}", sort_by, query.sort_order);
        let sort_order = query.sort_order.as_deref().unwrap_or("asc");
        filtered.sort_by(|a, b| {
            let comparison = match sort_by.as_str() {
                "name" => a.name.cmp(&b.name),
                "price" => a.price.partial_cmp(&b.price).unwrap_or(std::cmp::Ordering::Equal),
                "category" => a.category.as_ref().unwrap_or(&String::new()).cmp(&b.category.as_ref().unwrap_or(&String::new())),
                _ => std::cmp::Ordering::Equal,
            };
            if sort_order == "desc" {
                comparison.reverse()
            } else {
                comparison
            }
        });
    }

    filtered
}

async fn upload_file(mut payload: Multipart) -> impl Responder {
    // Create uploads directory if it doesn't exist
    let upload_dir = Path::new("uploads");
    if !upload_dir.exists() {
        if let Err(e) = fs::create_dir_all(upload_dir) {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to create upload directory: {}", e)
            }));
        }
    }

    let mut filename = String::new();

    while let Some(item) = payload.next().await {
        let mut field = match item {
            Ok(field) => field,
            Err(e) => {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "error": format!("Failed to process upload: {}", e)
                }));
            }
        };

        let content_disposition = field.content_disposition();
        filename = content_disposition.get_filename().unwrap_or("unknown").to_string();
        let file_path = upload_dir.join(&filename);

        let mut file = match fs::File::create(&file_path) {
            Ok(file) => file,
            Err(e) => {
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to create file: {}", e)
                }));
            }
        };

        while let Some(chunk) = field.next().await {
            let data = match chunk {
                Ok(data) => data,
                Err(e) => {
                    return HttpResponse::BadRequest().json(serde_json::json!({
                        "error": format!("Failed to read chunk: {}", e)
                    }));
                }
            };

            if let Err(e) = file.write_all(&data) {
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to write chunk: {}", e)
                }));
            }
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "File uploaded successfully",
        "filename": filename
    }))
}

async fn download_file(filename: web::Path<String>) -> impl Responder {
    let filepath = Path::new("uploads").join(&*filename);
    
    // Check if file exists
    if !filepath.exists() {
        return HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("File '{}' not found", filename)
        }));
    }

    // Get file metadata
    let metadata = match fs::metadata(&filepath) {
        Ok(m) => m,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get file metadata: {}", e)
            }));
        }
    };

    // Determine content type based on file extension
    let content_type = match filepath.extension().and_then(|ext| ext.to_str()) {
        Some("pdf") => "application/pdf",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("txt") => "text/plain",
        _ => "application/octet-stream",
    };

    // Create a stream from the file
    let filepath_clone = filepath.clone();
    let stream = futures::stream::once(async move { 
        match fs::read(&filepath_clone) {
            Ok(data) => Ok::<_, std::io::Error>(Bytes::from(data)),
            Err(e) => Err(e)
        }
    });

    HttpResponse::Ok()
        .content_type(content_type)
        .append_header(("Content-Disposition", format!("attachment; filename=\"{}\"", filename)))
        .append_header(("Content-Length", metadata.len()))
        .streaming(stream)
}

async fn list_files() -> impl Responder {
    let upload_dir = Path::new("uploads");
    
    // Check if directory exists
    if !upload_dir.exists() {
        return HttpResponse::Ok().json(serde_json::json!({
            "files": Vec::<String>::new()
        }));
    }

    // Read directory contents
    let files = match fs::read_dir(upload_dir) {
        Ok(entries) => {
            entries
                .filter_map(|entry| {
                    entry.ok().and_then(|e| {
                        e.file_name().into_string().ok()
                    })
                })
                .collect::<Vec<String>>()
        },
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to read upload directory: {}", e)
            }));
        }
    };

    HttpResponse::Ok().json(serde_json::json!({
        "files": files
    }))
}

async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok"
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv().ok();
    
    // Get the current directory and create absolute path for database
    let current_dir = std::env::current_dir().expect("Failed to get current directory");
    let db_path = current_dir.join("products.db");
    let database_url = format!("sqlite:{}", db_path.display());

    // Initialize database connection
    let db_pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool.");

    // Initialize the app state with WebSocket channel and database pool
    let (product_tx, _) = broadcast::channel(100);
    let app_state = web::Data::new(AppState {
        is_generating: Arc::new(AtomicBool::new(false)),
        product_tx,
        db_pool,
    });

    println!("Server running at http://localhost:3001");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(app_state.clone())
            .route("/ws", web::get().to(product_ws))
            .route("/api/toggle-generation", web::post().to(toggle_generation))
            .route("/api/products", web::get().to(get_products))
            .route("/api/products", web::post().to(create_product))
            .route("/api/products/{id}", web::get().to(get_product))
            .route("/api/products/{id}", web::put().to(update_product))
            .route("/api/products/{id}", web::delete().to(delete_product))
            .route("/api/upload", web::post().to(upload_file))
            .route("/api/download/{filename}", web::get().to(download_file))
            .route("/api/files", web::get().to(list_files))
            .route("/api/health", web::get().to(health_check))
    })
    .bind("127.0.0.1:3001")?
    .run()
    .await
}