# Architecture Decision Records

Short records of PayLoop's locked design decisions: the context, the decision,
and its consequences. Add a new numbered file for each significant decision;
keep records concise and update them if a decision is reversed.

| ADR                                                      | Decision                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| [0001](0001-instant-release.md)                          | Instant release instead of held escrow                                |
| [0002](0002-mocked-anchor-offramp.md)                    | Mocked SEP-24 anchor for the USDC→Naira off-ramp                      |
| [0003](0003-no-application-database.md)                  | No application database; the contract is the source of truth          |
| [0004](0004-admin-has-no-powers-after-init.md)           | The admin has no powers after initialization                          |
