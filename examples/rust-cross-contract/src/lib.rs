#![no_std]

//! Example: a Soroban contract that reads invoices from a deployed PayLoop
//! invoice contract with a cross-contract call.
//!
//! The pattern is useful for any contract that should react to a payment, for
//! example "unlock this resource once invoice #N is paid".
//!
//! The types below mirror the ones in `contracts/invoice/src/lib.rs`. They must
//! keep the same field names, field types and enum values, because Soroban
//! decodes the other contract's return value by shape.

use soroban_sdk::{contract, contractclient, contractimpl, contracttype, Address, Env, String};

/// Mirror of PayLoop's `InvoiceStatus`.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum InvoiceStatus {
    Pending = 0,
    Paid = 1,
}

/// Mirror of PayLoop's `Invoice`.
#[contracttype]
#[derive(Clone)]
pub struct Invoice {
    pub id: u64,
    pub freelancer: Address,
    pub client: Address,
    pub token: Address,
    pub amount: i128,
    pub description: String,
    pub due_date: u64,
    pub status: InvoiceStatus,
    pub created_at: u64,
    pub paid_at: u64,
}

/// The slice of PayLoop's interface this example calls. `contractclient`
/// generates `PayLoopClient`, with `get_invoice` and a non-panicking
/// `try_get_invoice`.
#[contractclient(name = "PayLoopClient")]
pub trait PayLoopInvoice {
    fn get_invoice(env: Env, invoice_id: u64) -> Invoice;
}

#[contract]
pub struct InvoiceReader;

#[contractimpl]
impl InvoiceReader {
    /// The status of an invoice on the given PayLoop contract, or `None` if
    /// the invoice does not exist (or the call fails for any other reason).
    pub fn invoice_status(env: Env, payloop: Address, invoice_id: u64) -> Option<InvoiceStatus> {
        let client = PayLoopClient::new(&env, &payloop);
        match client.try_get_invoice(&invoice_id) {
            Ok(Ok(invoice)) => Some(invoice.status),
            _ => None,
        }
    }

    /// True only when the invoice exists and has been paid.
    pub fn is_paid(env: Env, payloop: Address, invoice_id: u64) -> bool {
        Self::invoice_status(env, payloop, invoice_id) == Some(InvoiceStatus::Paid)
    }

    /// The amount paid to `freelancer` for this invoice, or 0 if the invoice
    /// is missing, unpaid, or was issued by someone else. Use this to gate
    /// access on a real payment to a specific party.
    pub fn paid_amount_for(env: Env, payloop: Address, invoice_id: u64, freelancer: Address) -> i128 {
        let client = PayLoopClient::new(&env, &payloop);
        match client.try_get_invoice(&invoice_id) {
            Ok(Ok(invoice)) if invoice.status == InvoiceStatus::Paid && invoice.freelancer == freelancer => {
                invoice.amount
            }
            _ => 0,
        }
    }
}
