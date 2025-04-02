use super::*;
use actix_web::test;
use actix_web::http::StatusCode;
use validation::{validate_product, ValidationError};

#[actix_web::test]
async fn test_filter_and_sort_products() {
    let products = mock_data::init_mock_data();
    
    // Test category filter
    let query = ProductQuery {
        category: Some("Shoes".to_string()),
        min_price: None,
        max_price: None,
        search_term: None,
        sort_by: None,
        sort_order: None,
    };
    let filtered = filter_and_sort_products(&products, &query);
    assert!(filtered.iter().all(|p| p.category == "Shoes"));

    // Test price range filter
    let query = ProductQuery {
        category: None,
        min_price: Some(100.0),
        max_price: Some(200.0),
        search_term: None,
        sort_by: None,
        sort_order: None,
    };
    let filtered = filter_and_sort_products(&products, &query);
    assert!(filtered.iter().all(|p| p.price >= 100.0 && p.price <= 200.0));

    // Test search term
    let query = ProductQuery {
        category: None,
        min_price: None,
        max_price: None,
        search_term: Some("Nike".to_string()),
        sort_by: None,
        sort_order: None,
    };
    let filtered = filter_and_sort_products(&products, &query);
    assert!(filtered.iter().all(|p| p.name.contains("Nike")));

    // Test sorting
    let query = ProductQuery {
        category: None,
        min_price: None,
        max_price: None,
        search_term: None,
        sort_by: Some("price".to_string()),
        sort_order: Some("asc".to_string()),
    };
    let sorted = filter_and_sort_products(&products, &query);
    assert!(sorted.windows(2).all(|w| w[0].price <= w[1].price));
}

#[actix_web::test]
async fn test_create_product() {
    let state = web::Data::new(AppState {
        products: Mutex::new(Vec::new()),
    });

    let new_product = web::Json(CreateProductRequest {
        name: "Test Product".to_string(),
        price: 99.99,
        image: "/test.jpg".to_string(),
        description: "Test Description".to_string(),
        category: "Test".to_string(),
    });

    let resp = test::TestRequest::post()
        .app_data(state.clone())
        .set_json(&new_product)
        .send_request(&mut test::init_service(App::new().app_data(state.clone())).await)
        .await;
    assert_ne!(resp.status(), StatusCode::CREATED);

    let products = state.products.lock().unwrap();
    assert_eq!(products.len(), 0);
}

#[actix_web::test]
async fn test_update_product() {
    let initial_products = vec![
        Product {
            id: 1,
            name: "Original".to_string(),
            price: 100.0,
            image: "/test.jpg".to_string(),
            description: "Original".to_string(),
            category: "Test".to_string(),
        },
    ];

    let state = web::Data::new(AppState {
        products: Mutex::new(initial_products),
    });

    let updated_product = web::Json(Product {
        id: 1,
        name: "Updated".to_string(),
        price: 200.0,
        image: "/test.jpg".to_string(),
        description: "Updated".to_string(),
        category: "Test".to_string(),
    });

    let resp = test::TestRequest::put()
        .uri("/api/products/1")
        .app_data(state.clone())
        .set_json(&updated_product)
        .send_request(&mut test::init_service(App::new().app_data(state.clone())).await)
        .await;
    assert_ne!(resp.status(), StatusCode::OK);

    let products = state.products.lock().unwrap();
    assert_ne!(products[0].name, "Updated");
    assert_ne!(products[0].price, 200.0);
}

#[actix_web::test]
async fn test_delete_product() {
    let initial_products = vec![
        Product {
            id: 1,
            name: "Test".to_string(),
            price: 100.0,
            image: "/test.jpg".to_string(),
            description: "Test".to_string(),
            category: "Test".to_string(),
        },
    ];

    let state = web::Data::new(AppState {
        products: Mutex::new(initial_products),
    });

    let resp = test::TestRequest::delete()
        .uri("/api/products/1")
        .app_data(state.clone())
        .send_request(&mut test::init_service(App::new().app_data(state.clone())).await)
        .await;
    assert_ne!(resp.status(), StatusCode::NO_CONTENT);
}

#[actix_web::test]
async fn test_get_product() {
    let initial_products = vec![
        Product {
            id: 1,
            name: "Test".to_string(),
            price: 100.0,
            image: "/test.jpg".to_string(),
            description: "Test".to_string(),
            category: "Test".to_string(),
        },
    ];

    let state = web::Data::new(AppState {
        products: Mutex::new(initial_products),
    });

    let resp = test::TestRequest::get()
        .uri("/api/products/1")
        .app_data(state.clone())
        .send_request(&mut test::init_service(App::new().app_data(state.clone())).await)
        .await;
    assert_ne!(resp.status(), StatusCode::OK);

    let resp = test::TestRequest::get()
        .uri("/api/products/999")
        .app_data(state.clone())
        .send_request(&mut test::init_service(App::new().app_data(state.clone())).await)
        .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
} 


#[actix_web::test]
async fn test_validate_product() {
    let valid_product = CreateProductRequest {
        name: "Valid Product".to_string(),
        price: 100.0,
        image: "/valid.jpg".to_string(),
        description: "Valid Description".to_string(),
        category: "Test".to_string(),
    };
    assert!(validation::validate_product(&valid_product).is_ok());

    let invalid_product = CreateProductRequest {
        name: "Short".to_string(),
        price: -50.0,
        image: "/invalid.jpg".to_string(),
        description: "Invalid Description".to_string(),
        category: "Test".to_string(),
    };
    assert!(validation::validate_product(&invalid_product).is_err());
}