use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub price: f64,
    pub image: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub price: f64,
    pub image: Option<String>,
    pub description: Option<String>,
    pub category: String,
}

#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub category: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub search_term: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
} 