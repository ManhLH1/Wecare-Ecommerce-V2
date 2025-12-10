export const getPromotionFilter = (customerGroupIds: string[]) => {
  const promotionFilter = `?$select=crdfd_promotionid,crdfd_name,crdfd_type@OData.Community.Display.V1.FormattedValue,crdfd_startdate,crdfd_enddate,crdfd_description&$filter=Microsoft.Dynamics.CRM.In(PropertyName='crdfd_customergroup',PropertyValues=[${customerGroupIds}]) and crdfd_type@OData.Community.Display.V1.FormattedValue ne 'Order' and crdfd_type@OData.Community.Display.V1.FormattedValue ne 'Revenue'`; 
  return promotionFilter;
}; 