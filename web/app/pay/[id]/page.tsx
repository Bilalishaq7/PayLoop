import type { Metadata } from "next";
import { config } from "@/lib/config";
import { getInvoice, getTokenMetadata } from "@/lib/contract";
import { formatAmount } from "@/lib/format";
import { buildInvoiceMetadata } from "@/lib/invoice-metadata";
import PayClient from "./PayClient";

type PayParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PayParams): Promise<Metadata> {
  const { id } = await params;

  // Sharing a link must still produce a useful preview when RPC is down or
  // the id does not exist. The client keeps its own loading and error states.
  const invoice = await getInvoice(id).catch(() => null);
  const token = invoice
    ? await getTokenMetadata(invoice.token).catch(() => null)
    : null;

  return buildInvoiceMetadata(
    id,
    invoice
      ? {
          id: invoice.id,
          amountLabel: `${formatAmount(invoice.amount, token?.decimals)} ${
            token?.symbol ?? config.tokenSymbol
          }`,
          status: invoice.status,
        }
      : null
  );
}

export default async function PayPage({ params }: PayParams) {
  const { id } = await params;
  return <PayClient id={id} />;
}
