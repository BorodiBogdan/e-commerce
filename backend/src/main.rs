use actix_web::{web, App, HttpServer, HttpResponse, Responder};

async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello, world!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(hello))
    })
    .bind("127.0.0.1:5080")?
    .run()
    .await
}