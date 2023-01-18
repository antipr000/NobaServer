-- Move any transactions with a legacy status to COMPLETED

update "Transaction"
set status='COMPLETED'
where status not in ('INITIATED',
                     'COMPLETED',
                     'FAILED',
                     'PROCESSING',
                     'EXPIRED');