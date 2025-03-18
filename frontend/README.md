# E-commerce Product Management App

A simple product management application built with Next.js and TypeScript.

## Features

- View all products in a responsive grid layout
- Add new products with validation
- Edit existing products
- Delete products
- Filter products by:
  - Category
  - Price range
  - Search term
- Sort products by:
  - Name
  - Price
  - Category
- Data persistence using in-memory storage
- Form validation
- Unit tests for core functionality

## Getting Started

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Run the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Running Tests

To run the unit tests:

```bash
npm test
# or
yarn test
```

## Project Structure

- `/src/services/productService.ts` - Core product management logic and data storage
- `/src/services/__tests__/productService.test.ts` - Unit tests for the product service
- `/src/app/components/` - React components
- `/src/app/page.tsx` - Main application page

## Data Validation

The application validates the following fields:

- Name: Must be at least 3 characters long
- Price: Must be greater than 0
- Description: Must be at least 10 characters long
- Category: Required field

## Technologies Used

- Next.js
- TypeScript
- Tailwind CSS
- Jest (for testing)

## Future Enhancements

- Add image upload functionality
- Add user authentication
- Add categories management
- Add pagination
- Add more advanced filtering options
- Add data export/import functionality
