use crate::models::CreateProductRequest;
use actix_web::HttpResponse;

pub struct ValidationError {
    message: String,
}

impl ValidationError {
    pub fn new(message: String) -> Self {
        Self { message }
    }

    pub fn error_response(&self) -> HttpResponse {
        HttpResponse::BadRequest().json(serde_json::json!({
            "error": self.message
        }))
    }
}

pub fn validate_product(product: &CreateProductRequest) -> Result<(), ValidationError> {
    if product.name.is_empty() {
        return Err(ValidationError::new("Product name cannot be empty".to_string()));
    }

    if product.price <= 0.0 {
        return Err(ValidationError::new("Product price must be greater than 0".to_string()));
    }

    if product.category.is_empty() {
        return Err(ValidationError::new("Product category cannot be empty".to_string()));
    }

    if let Some(description) = &product.description {
        if description.len() < 10 {
            return Err(ValidationError::new("Product description must be at least 10 characters long".to_string()));
        }
    }

    Ok(())
}