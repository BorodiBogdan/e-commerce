use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::HashMap;
use rand::Rng;
use models::{Product, CreateProductRequest, ProductQuery};

mod models;
mod mock_data;

// Global state to store products
pub struct AppState {
    products: Mutex<Vec<Product>>,
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
        filtered.retain(|p| p.category == *category);
    }

    if let Some(min_price) = query.min_price {
        filtered.retain(|p| p.price >= min_price);
    }

    if let Some(max_price) = query.max_price {
        filtered.retain(|p| p.price <= max_price);
    }

    if let Some(search_term) = &query.search_term {
        let search_term = search_term.to_lowercase();
        filtered.retain(|p| {
            p.name.to_lowercase().contains(&search_term) ||
            p.description.to_lowercase().contains(&search_term) ||
            p.category.to_lowercase().contains(&search_term)
        });
    }

    // Apply sorting
    if let Some(sort_by) = &query.sort_by {
        let sort_order = query.sort_order.as_deref().unwrap_or("asc");
        filtered.sort_by(|a, b| {
            let comparison = match sort_by.as_str() {
                "name" => a.name.cmp(&b.name),
                "price" => a.price.partial_cmp(&b.price).unwrap_or(std::cmp::Ordering::Equal),
                "category" => a.category.cmp(&b.category),
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

async fn get_products(data: web::Data<AppState>, query: web::Query<ProductQuery>) -> impl Responder {
    let mut products = data.products.lock().unwrap();
    // Simulate price changes for each product
    for product in products.iter_mut() {
        product.price = simulate_price_change(product.price);
    }
    
    let filtered_products = filter_and_sort_products(&products, &query);
    HttpResponse::Ok().json(filtered_products)
}

async fn get_product(data: web::Data<AppState>, id: web::Path<i32>) -> impl Responder {
    let product_id = id.into_inner();
    let products = data.products.lock().unwrap();
    if let Some(product) = products.iter().find(|p| p.id == product_id) {
        HttpResponse::Ok().json(product)
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "error": "Product not found"
        }))
    }
}

async fn create_product(
    data: web::Data<AppState>,
    product: web::Json<CreateProductRequest>,
) -> impl Responder {
    let mut products = data.products.lock().unwrap();
    let new_product = Product {
        id: products.iter().map(|p| p.id).max().unwrap_or(0) + 1,
        name: product.name.clone(),
        price: product.price,
        image: product.image.clone(),
        description: product.description.clone(),
        category: product.category.clone(),
    };
    products.push(new_product.clone());
    HttpResponse::Created().json(new_product)
}

async fn update_product(
    data: web::Data<AppState>,
    id: web::Path<i32>,
    product: web::Json<Product>,
) -> impl Responder {
    let product_id = id.into_inner();
    let mut products = data.products.lock().unwrap();
    if let Some(index) = products.iter().position(|p| p.id == product_id) {
        let mut updated_product = product.into_inner();
        updated_product.id = product_id; // Ensure ID matches
        products[index] = updated_product.clone();
        HttpResponse::Ok().json(updated_product)
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "error": "Product not found"
        }))
    }
}

async fn delete_product(data: web::Data<AppState>, id: web::Path<i32>) -> impl Responder {
    let product_id = id.into_inner();
    let mut products = data.products.lock().unwrap();
    if let Some(index) = products.iter().position(|p| p.id == product_id) {
        products.remove(index);
        HttpResponse::NoContent().finish()
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "error": "Product not found"
        }))
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize the app state with mock data
    let app_state = web::Data::new(AppState {
        products: Mutex::new(mock_data::init_mock_data()),
    });

    println!("Server running at http://localhost:3001");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .wrap(cors)
            .app_data(app_state.clone())
            .route("/api/products", web::get().to(get_products))
            .route("/api/products", web::post().to(create_product))
            .route("/api/products/{id}", web::get().to(get_product))
            .route("/api/products/{id}", web::put().to(update_product))
            .route("/api/products/{id}", web::delete().to(delete_product))
    })
    .bind("127.0.0.1:3001")?
    .run()
    .await
}