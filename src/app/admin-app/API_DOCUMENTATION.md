# Admin App API Documentation

## Tổng quan

Admin App sử dụng các API endpoints riêng biệt để lấy dữ liệu cho các dropdown. Tất cả các API đều sử dụng token authentication từ `getAccessToken()`.

## Cấu trúc API

### Base URL
- Frontend API calls: `/api/admin-app/*`
- Backend API endpoints: `pages/api/admin-app/*`

### Authentication

Tất cả các API endpoints sử dụng token từ `getAccessToken()`:
```typescript
import { getAccessToken } from "../getAccessToken";

const token = await getAccessToken();
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
};
```

## API Endpoints

### 1. Customers API

**Endpoint:** `GET /api/admin-app/customers`

**Query Parameters:**
- `search` (optional): Tìm kiếm theo tên, số điện thoại

**Response:**
```typescript
interface Customer {
  crdfd_customerid: string;
  crdfd_name: string;
  cr44a_st?: string;
  crdfd_phone2?: string;
}
```

**Example:**
```typescript
// Fetch all customers
const customers = await fetch('/api/admin-app/customers');

// Search customers
const customers = await fetch('/api/admin-app/customers?search=ABC');
```

**Dataverse Table:** `crdfd_customers`

### 2. Products API

**Endpoint:** `GET /api/admin-app/products`

**Query Parameters:**
- `search` (optional): Tìm kiếm theo tên, fullname, mã sản phẩm

**Response:**
```typescript
interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname?: string;
  crdfd_masanpham?: string;
  crdfd_unitname?: string;
}
```

**Example:**
```typescript
// Fetch all products
const products = await fetch('/api/admin-app/products');

// Search products
const products = await fetch('/api/admin-app/products?search=Găng tay');
```

**Dataverse Table:** `crdfd_productses`

### 3. Units API

**Endpoint:** `GET /api/admin-app/units`

**Response:**
```typescript
interface Unit {
  crdfd_unitsid: string;
  crdfd_name: string;
}
```

**Example:**
```typescript
const units = await fetch('/api/admin-app/units');
```

**Dataverse Table:** `crdfd_unitses`

### 4. Sale Orders API

**Endpoint:** `GET /api/admin-app/sale-orders`

**Query Parameters:**
- `customerId` (optional): Lọc theo khách hàng

**Response:**
```typescript
interface SaleOrder {
  crdfd_sale_ordersid: string;
  crdfd_name: string;
  crdfd_so_code?: string;
  crdfd_so_auto?: string;
}
```

**Example:**
```typescript
// Fetch all sale orders
const saleOrders = await fetch('/api/admin-app/sale-orders');

// Fetch sale orders for a customer
const saleOrders = await fetch('/api/admin-app/sale-orders?customerId=xxx');
```

**Dataverse Table:** `crdfd_sale_orders`

## Frontend Usage

### Using API Service

```typescript
import { fetchCustomers, fetchProducts, fetchUnits, fetchSaleOrders } from './_api/adminApi';

// Fetch customers
const customers = await fetchCustomers('search term');

// Fetch products
const products = await fetchProducts('search term');

// Fetch units
const units = await fetchUnits();

// Fetch sale orders
const saleOrders = await fetchSaleOrders('customerId');
```

### Using Hooks

```typescript
import { useCustomers, useProducts, useUnits, useSaleOrders } from './_hooks/useDropdownData';

function MyComponent() {
  const [search, setSearch] = useState('');
  const { customers, loading, error } = useCustomers(search);
  const { products } = useProducts();
  const { units } = useUnits();
  const { saleOrders } = useSaleOrders('customerId');

  // Use data in your component
}
```

### Using Dropdown Component

```typescript
import Dropdown from './_components/Dropdown';

<Dropdown
  options={customers.map(c => ({
    value: c.crdfd_customerid,
    label: c.crdfd_name,
  }))}
  value={selectedValue}
  onChange={(value, option) => {
    // Handle selection
  }}
  placeholder="Chọn khách hàng"
  loading={loading}
  searchable
  onSearch={setSearch}
/>
```

## Token Management

Token được quản lý tự động bởi `getAccessToken()`:
- Token được cache trong 55 phút
- Tự động refresh khi token hết hạn
- Retry logic khi có lỗi

## Error Handling

Tất cả các API endpoints trả về:
- `200`: Success với data
- `401`: Authentication failed
- `405`: Method not allowed
- `500`: Server error với error message

## Filter Logic

### Customers
- Filter: `statecode eq 0` (chỉ lấy active)
- Search: Tìm trong `crdfd_name`, `cr44a_st`, `crdfd_phone2`
- Order: Sắp xếp theo `crdfd_name`
- Limit: Top 100

### Products
- Filter: `statecode eq 0` (chỉ lấy active)
- Search: Tìm trong `crdfd_name`, `crdfd_fullname`, `crdfd_masanpham`
- Order: Sắp xếp theo `crdfd_name`
- Limit: Top 200

### Units
- Filter: `statecode eq 0` (chỉ lấy active)
- Order: Sắp xếp theo `crdfd_name`
- Limit: Top 500

### Sale Orders
- Filter: `statecode eq 0` (chỉ lấy active)
- Optional: Filter theo `_crdfd_khachhang_value` nếu có `customerId`
- Order: Sắp xếp theo `crdfd_ngaytaoonhang desc`
- Limit: Top 100

## Best Practices

1. **Debounce Search**: Sử dụng debounce cho search input (300ms)
2. **Loading States**: Luôn hiển thị loading state khi fetch data
3. **Error Handling**: Xử lý lỗi và hiển thị thông báo cho user
4. **Caching**: Data được cache ở client-side để giảm API calls
5. **Pagination**: Có thể mở rộng để hỗ trợ pagination cho large datasets

## Future Enhancements

- [ ] Pagination support
- [ ] Infinite scroll
- [ ] Advanced filtering
- [ ] Caching với React Query
- [ ] Optimistic updates
- [ ] Real-time updates với WebSocket

