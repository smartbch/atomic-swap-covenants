# AtomicSwap(HTLC) BCH Covenants

You can use `scripts/htlc.ts`  to test HTLC covenant on BCH chipnet.



## Prepare

```bash
# install node.js
# install ts-node
# install cashc

git clone https://github.com/smartbch/atomic-swap-covenants.git
cd atomic-swap-covenant
npm i
```



## Print HTLC redeem script (without constructor args)

```bash
cashc --hex covenants/HTLC5.cash
```



## Generate test address

Example:

```bash
ts-node scripts/htlc.ts gen-user
```



## Print test user info

Example:

```bash
ts-node scripts/htlc.ts user-info \
  --wif=cPoiXWwPS9Xtvoe6DJ2CMmCiaJqUDPKX1vBRsaQNA6C9HKwBTxte

ts-node scripts/htlc.ts user-info \
  --wif=cUw45Hq2UkDYqYWz9JwMJGJuhETFWFN4AAY87WffFRSD8aAV9dZy
```



## Print HTLC info

Example:

```bash
ts-node scripts/htlc.ts htlc \
  --sender-addr=bchtest:qz9hn65eumzpsam2njwjchwqwj6yqny22uzluhy5d0 \
  --recipient-addr=bchtest:qzf2nglh7zaatd4xdw2ahp540hnzw77yjymjgxkj0w \
  --secret=123 \
  --expiration=36 \
  --penalty-bps=500
```



## Lock BCH to HTLC

Example:

```bash
ts-node scripts/htlc.ts lock \
  --sender-wif=cPoiXWwPS9Xtvoe6DJ2CMmCiaJqUDPKX1vBRsaQNA6C9HKwBTxte \
  --recipient-addr=bchtest:qzf2nglh7zaatd4xdw2ahp540hnzw77yjymjgxkj0w \
  --secret=123 \
  --expiration=36 \
  --penalty-bps=500 \
  --amt=5000 \
  --sbch-addr=0x621e0B041D19B6472B1e991fE53D78aF3C264FA8 \
  --expected-price=1.0 \
  --unsigned=true
```



## Unlock BCH from HTLC

Example:

```bash
ts-node scripts/htlc.ts unlock \
  --recipient-wif=cUw45Hq2UkDYqYWz9JwMJGJuhETFWFN4AAY87WffFRSD8aAV9dZy \
  --sender-addr=bchtest:qz9hn65eumzpsam2njwjchwqwj6yqny22uzluhy5d0 \
  --secret=123 \
  --expiration=36 \
  --penalty-bps=500 \
  --miner-fee=1000 \
  --dry-run=true
```



## Refund BCH from HTLC

Example:

```bash
ts-node scripts/htlc.ts refund \
  --sender-wif=cPoiXWwPS9Xtvoe6DJ2CMmCiaJqUDPKX1vBRsaQNA6C9HKwBTxte \
  --recipient-addr=bchtest:qzf2nglh7zaatd4xdw2ahp540hnzw77yjymjgxkj0w \
  --secret=123 \
  --expiration=36 \
  --penalty-bps=500 \
  --miner-fee=1000 \
  --dry-run=true
```

