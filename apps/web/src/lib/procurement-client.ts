import { clientApiFetch } from "./client-api";
import type { 
  PurchaseRequisition, 
  PurchaseOrder, 
  PurchaseOrderVersion,
  SupplierAcknowledgement,
  PurchaseOrderDeliveryPlan,
  GoodsReceipt,
} from "./procurement";

// Requisitions

export async function createRequisition(payload: unknown) {
  return clientApiFetch<PurchaseRequisition>("/api/v1/purchase-requisitions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRequisition(id: string, payload: unknown) {
  return clientApiFetch<PurchaseRequisition>(`/api/v1/purchase-requisitions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function submitRequisition(id: string) {
  return clientApiFetch<PurchaseRequisition>(`/api/v1/purchase-requisitions/${id}/submit`, {
    method: "POST",
  });
}

export async function approveRequisition(id: string) {
  return clientApiFetch<PurchaseRequisition>(`/api/v1/purchase-requisitions/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectRequisition(id: string) {
  return clientApiFetch<PurchaseRequisition>(`/api/v1/purchase-requisitions/${id}/reject`, {
    method: "POST",
  });
}

export async function cancelRequisition(id: string) {
  return clientApiFetch<PurchaseRequisition>(`/api/v1/purchase-requisitions/${id}/cancel`, {
    method: "POST",
  });
}

export async function convertRequisitionToPurchaseOrder(id: string, payload: unknown) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-requisitions/${id}/create-purchase-order`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Purchase Orders

export async function createPurchaseOrder(payload: unknown) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePurchaseOrder(id: string, payload: unknown) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function submitPurchaseOrder(id: string) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}/submit`, {
    method: "POST",
  });
}

export async function approvePurchaseOrder(id: string) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectPurchaseOrder(id: string) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}/reject`, {
    method: "POST",
  });
}

export async function issuePurchaseOrder(id: string) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}/issue`, {
    method: "POST",
  });
}

export async function cancelPurchaseOrder(id: string) {
  return clientApiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}/cancel`, {
    method: "POST",
  });
}

export async function createPurchaseOrderVersion(id: string) {
  return clientApiFetch<PurchaseOrderVersion>(`/api/v1/purchase-orders/${id}/new-version`, {
    method: "POST",
  });
}

export async function createGoodsReceipt(poId: string, payload: unknown) {
  return clientApiFetch<GoodsReceipt>(`/api/v1/purchase-orders/${poId}/goods-receipts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postGoodsReceipt(receiptId: string) {
  return clientApiFetch<GoodsReceipt>(`/api/v1/goods-receipts/${receiptId}/post`, {
    method: "POST",
  });
}

// Acknowledgements

export async function createSupplierAcknowledgement(poId: string, payload: unknown) {
  return clientApiFetch<SupplierAcknowledgement>(`/api/v1/purchase-orders/${poId}/acknowledgements`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSupplierAcknowledgement(poId: string, ackId: string, payload: unknown) {
  return clientApiFetch<SupplierAcknowledgement>(`/api/v1/purchase-orders/${poId}/acknowledgements/${ackId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Delivery Plans

export async function createDeliveryPlan(poId: string, payload: unknown) {
  return clientApiFetch<PurchaseOrderDeliveryPlan>(`/api/v1/purchase-orders/${poId}/delivery-plans`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDeliveryPlan(poId: string, planId: string, payload: unknown) {
  return clientApiFetch<PurchaseOrderDeliveryPlan>(`/api/v1/purchase-orders/${poId}/delivery-plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
