/**
 * Dynamics 365 Query Optimization Utilities
 * Optimizes OData queries with $expand, nested $filter, and batch operations
 */

interface QueryOptions {
  select?: string[];
  expand?: Array<{
    navigationProperty: string;
    select?: string[];
    filter?: string;
    expand?: any[];
  }>;
  filter?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
}

interface BatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Build optimized OData query string with $expand and nested filters
 */
export function buildOptimizedQuery(options: QueryOptions): string {
  const params: string[] = [];

  // $select
  if (options.select && options.select.length > 0) {
    params.push(`$select=${options.select.join(',')}`);
  }

  // $expand with nested options
  if (options.expand && options.expand.length > 0) {
    const expandParts = options.expand.map(exp => {
      let expandStr = exp.navigationProperty;

      const subParams: string[] = [];

      if (exp.select && exp.select.length > 0) {
        subParams.push(`$select=${exp.select.join(',')}`);
      }

      if (exp.filter) {
        subParams.push(`$filter=${encodeURIComponent(exp.filter)}`);
      }

      if (exp.expand && exp.expand.length > 0) {
        // Recursive expand building
        const subExpand = exp.expand.map(subExp => {
          let subExpandStr = subExp.navigationProperty;
          const subSubParams: string[] = [];

          if (subExp.select && subExp.select.length > 0) {
            subSubParams.push(`$select=${subExp.select.join(',')}`);
          }

          if (subExp.filter) {
            subSubParams.push(`$filter=${encodeURIComponent(subExp.filter)}`);
          }

          if (subSubParams.length > 0) {
            subExpandStr += `(${subSubParams.join(';')})`;
          }

          return subExpandStr;
        });

        subParams.push(`$expand=${subExpand.join(',')}`);
      }

      if (subParams.length > 0) {
        expandStr += `(${subParams.join(';')})`;
      }

      return expandStr;
    });

    params.push(`$expand=${expandParts.join(',')}`);
  }

  // $filter
  if (options.filter) {
    params.push(`$filter=${encodeURIComponent(options.filter)}`);
  }

  // $orderby
  if (options.orderBy) {
    params.push(`$orderby=${options.orderBy}`);
  }

  // $top
  if (options.top && options.top > 0) {
    params.push(`$top=${options.top}`);
  }

  // $skip
  if (options.skip && options.skip > 0) {
    params.push(`$skip=${options.skip}`);
  }

  return params.join('&');
}

/**
 * Build complex filter with multiple conditions and operators
 */
export function buildComplexFilter(conditions: Array<{
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'contains' | 'startswith' | 'endswith';
  value: any;
  logicalOperator?: 'and' | 'or';
}>): string {
  if (!conditions || conditions.length === 0) return '';

  const filterParts = conditions.map((condition, index) => {
    const { field, operator, value, logicalOperator } = condition;

    let filterValue: string;
    if (typeof value === 'string') {
      // Escape single quotes and wrap in quotes
      filterValue = `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'boolean') {
      filterValue = value ? 'true' : 'false';
    } else {
      filterValue = String(value);
    }

    let conditionStr: string;
    switch (operator) {
      case 'contains':
        conditionStr = `contains(${field},${filterValue})`;
        break;
      case 'startswith':
        conditionStr = `startswith(${field},${filterValue})`;
        break;
      case 'endswith':
        conditionStr = `endswith(${field},${filterValue})`;
        break;
      default:
        conditionStr = `${field} ${operator} ${filterValue}`;
    }

    return conditionStr;
  });

  // Join with logical operators - default to 'and' if not specified
  return filterParts.map((part, index) => {
    if (index === 0) return part;

    const condition = conditions[index];
    const logicalOp = condition.logicalOperator || 'and';
    return ` ${logicalOp} ${part}`;
  }).join('');
}

/**
 * Build simple OData filter with proper escaping and 'and' operators
 */
export function buildSafeODataFilter(conditions: Array<{
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'contains' | 'startswith' | 'endswith';
  value: any;
}>): string {
  if (!conditions || conditions.length === 0) return '';

  const filterParts = conditions.map(({ field, operator, value }, index) => {
    let filterValue: string;
    if (typeof value === 'string') {
      // Escape single quotes and wrap in quotes
      filterValue = `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'boolean') {
      filterValue = value ? 'true' : 'false';
    } else {
      filterValue = String(value);
    }

    let conditionStr: string;
    switch (operator) {
      case 'contains':
        conditionStr = `contains(${field},${filterValue})`;
        break;
      case 'startswith':
        conditionStr = `startswith(${field},${filterValue})`;
        break;
      case 'endswith':
        conditionStr = `endswith(${field},${filterValue})`;
        break;
      default:
        conditionStr = `${field} ${operator} ${filterValue}`;
    }

    return conditionStr;
  });

  // Join with ' and ' between conditions
  return filterParts.join(' and ');
}

// Test function to verify filter building
export function testBuildSafeODataFilter() {
  const conditions = [
    { field: 'crdfd_masp', operator: 'eq' as const, value: 'SP-021469' },
    { field: 'statecode', operator: 'eq' as const, value: 0 },
    { field: 'crdfd_vitrikhofx', operator: 'eq' as const, value: 'Kho Tp. Hồ Chí Minh' }
  ];

  const result = buildSafeODataFilter(conditions);
  console.log('Test result:', result);
  return result;
}

/**
 * Build batch request payload for multiple operations
 */
export function buildBatchRequest(requests: BatchRequest[]): string {
  const boundary = `batch_${Date.now()}`;
  const batchId = `batch_${Date.now()}`;

  let payload = `--${boundary}\n`;
  payload += `Content-Type: multipart/mixed; boundary=changeset_${batchId}\n\n`;

  requests.forEach((request, index) => {
    payload += `--changeset_${batchId}\n`;
    payload += `Content-Type: application/http\n`;
    payload += `Content-Transfer-Encoding: binary\n`;
    payload += `Content-ID: ${index + 1}\n\n`;

    payload += `${request.method} ${request.url} HTTP/1.1\n`;

    // Default headers
    const headers = {
      'Content-Type': 'application/json; type=entry',
      'Accept': 'application/json',
      ...request.headers
    };

    Object.entries(headers).forEach(([key, value]) => {
      payload += `${key}: ${value}\n`;
    });

    payload += `\n`;

    if (request.body && (request.method === 'POST' || request.method === 'PATCH')) {
      payload += `${JSON.stringify(request.body)}\n`;
    }

    payload += `\n`;
  });

  payload += `--changeset_${batchId}--\n`;
  payload += `--${boundary}--\n`;

  return payload;
}

/**
 * Optimize inventory query by combining multiple related queries
 */
export function buildOptimizedInventoryQuery(productCode: string, warehouseName?: string, isVatOrder = false): {
  endpoint: string;
  headers: Record<string, string>;
} {
  const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

  // For VAT orders, try to get data from multiple sources in one query using $expand
  if (isVatOrder && warehouseName) {
    const queryOptions: QueryOptions = {
      select: [
        'crdfd_kho_binh_dinhid',
        'crdfd_masp',
        'cr1bb_tonkholythuyetbomua',
        'crdfd_tonkholythuyet',
        'cr1bb_soluonganggiuathang',
        'crdfd_vitrikhofx'
      ],
      filter: buildComplexFilter([
        { field: 'crdfd_masp', operator: 'eq', value: productCode, logicalOperator: 'and' },
        { field: 'statecode', operator: 'eq', value: 0, logicalOperator: 'and' },
        { field: 'crdfd_vitrikhofx', operator: 'eq', value: warehouseName }
      ]),
      top: 1
    };

    const query = buildOptimizedQuery(queryOptions);
    const endpoint = `${baseUrl}crdfd_kho_binh_dinhs?${query}`;

    return {
      endpoint,
      headers: {
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": "odata.maxpagesize=1"
      }
    };
  }

  // For non-VAT orders, use the inventory weshops table
  const queryOptions: QueryOptions = {
    select: [
      'cr44a_inventoryweshopid',
      'cr44a_masp',
      'cr44a_tonkhotheolythuyet',
      'cr44a_tonkho',
      'cr44a_ten_kho'
    ],
    filter: buildComplexFilter([
      { field: 'cr44a_masp', operator: 'eq', value: productCode },
      { field: 'statecode', operator: 'eq', value: 0 }
    ]),
    top: 1
  };

  if (warehouseName) {
    queryOptions.filter = buildComplexFilter([
      { field: 'cr44a_masp', operator: 'eq', value: productCode },
      { field: 'statecode', operator: 'eq', value: 0 },
      { field: 'cr44a_ten_kho', operator: 'eq', value: warehouseName }
    ]);
  }

  const query = buildOptimizedQuery(queryOptions);
  const endpoint = `${baseUrl}cr44a_inventoryweshops?${query}`;

  return {
    endpoint,
    headers: {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "odata.maxpagesize=1"
    }
  };
}

/**
 * Optimize customer query with related warehouse data in single request
 */
export function buildOptimizedCustomerWarehouseQuery(customerId?: string, customerCode?: string): {
  endpoint: string;
  headers: Record<string, string>;
} {
  const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

  const queryOptions: QueryOptions = {
    select: [
      'crdfd_customerid',
      'cr44a_makhachhang',
      'wc001_VItrikho',
      'cr1bb_vitrikhophu'
    ],
    expand: [{
      navigationProperty: 'wc001_VItrikho',
      select: ['crdfd_khowecareid', 'crdfd_name']
    }],
    filter: 'statecode eq 0',
    top: 1
  };

  // Add customer filter
  const conditions: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'contains' | 'startswith' | 'endswith';
    value: any;
    logicalOperator?: 'and' | 'or';
  }> = [{ field: 'statecode', operator: 'eq', value: 0 }];

  if (customerId) {
    conditions.push({ field: 'crdfd_customerid', operator: 'eq', value: customerId });
  } else if (customerCode) {
    conditions.push({ field: 'cr44a_makhachhang', operator: 'eq', value: customerCode });
  }

  queryOptions.filter = buildComplexFilter(conditions);

  const query = buildOptimizedQuery(queryOptions);
  const endpoint = `${baseUrl}crdfd_customers?${query}`;

  return {
    endpoint,
    headers: {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "odata.maxpagesize=1"
    }
  };
}

/**
 * Build optimized product query with unit conversions in single request
 */
export function buildOptimizedProductUnitQuery(productCode: string): {
  endpoint: string;
  headers: Record<string, string>;
} {
  const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

  const queryOptions: QueryOptions = {
    select: [
      'crdfd_productsid',
      'crdfd_masanpham',
      'crdfd_name'
    ],
    expand: [{
      navigationProperty: 'crdfd_crdfd_productses_crdfd_unitconvertions',
      select: [
        'crdfd_unitconvertionid',
        'crdfd_onvichuyenoitransfome',
        'crdfd_giatrichuyenoi',
        'crdfd_onvichuan'
      ],
      filter: 'statecode eq 0'
    }],
    filter: buildComplexFilter([
      { field: 'crdfd_masanpham', operator: 'eq', value: productCode },
      { field: 'statecode', operator: 'eq', value: 0 }
    ]),
    top: 1
  };

  const query = buildOptimizedQuery(queryOptions);
  const endpoint = `${baseUrl}crdfd_productses?${query}`;

  return {
    endpoint,
    headers: {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "odata.include-annotations=*"
    }
  };
}
