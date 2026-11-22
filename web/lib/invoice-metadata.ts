import type { Metadata } from "next";

export type MetadataInvoice = {
  id: string;
  amountLabel: string;
  status: string;
};

// Pure so the exact share-card title can be tested without RPC or React.
export function buildInvoiceMetadata(
  id: string,
  invoice: MetadataInvoice | null
): Metadata {
  const safeId = /^\d+$/.test(id) ? id : "unknown";
  const title = invoice
    ? `Invoice #${invoice.id} - ${invoice.amountLabel} - ${invoice.status}`
    : `Invoice #${safeId} on PayLoop`;
  const description = invoice
    ? `Invoice #${invoice.id} for ${invoice.amountLabel} is ${invoice.status.toLowerCase()}. Pay securely on PayLoop.`
    : "View and pay a PayLoop invoice on Stellar.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}
