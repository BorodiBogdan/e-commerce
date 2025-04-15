use crate::models::CreateProductRequest;
use actix_web::{HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub enum ValidationError {
    NegativePrice,
    NameTooShort,
    DescriptionTooShort,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ValidationError::NegativePrice => write!(f, "Price cannot be negative"),
            ValidationError::NameTooShort => write!(f, "Name must be at least 10 characters long"),
            ValidationError::DescriptionTooShort => write!(f, "Description must be at least 10 characters long"),
        }
    }
}

impl ResponseError for ValidationError {
    fn error_response(&self) -> HttpResponse {
        match self {
            ValidationError::NegativePrice => HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Price cannot be negative"
            })),
            ValidationError::NameTooShort => HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Name must be at least 10 characters long"
            })),
            ValidationError::DescriptionTooShort => HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Description must be at least 10 characters long"
            })),
        }
    }
}

pub fn validate_product(product: &CreateProductRequest) -> Result<(), ValidationError> {
    if product.price < 0.0 {
        return Err(ValidationError::NegativePrice);
    }
    
    if product.name.len() < 10 {
        return Err(ValidationError::NameTooShort);
    }
    
    if product.description.len() < 10 {
        return Err(ValidationError::DescriptionTooShort);
    }
    
    Ok(())
}