# Dynamic DNS Using Cloudflare Workers

[![CI](https://github.com/meyfa/ddns/actions/workflows/ci.yml/badge.svg)](https://github.com/meyfa/ddns/actions/workflows/ci.yml)

Dynamic DNS (DDNS) refers to keeping DNS records up-to-date whenever the IP address of the associated device changes.
This project implements DDNS using a server component hosted on Cloudflare Workers and a client component running on
the device via Docker.

## Quick Reference

* GitHub: https://github.com/meyfa/ddns
* Docker Hub: https://hub.docker.com/r/meyfa/ddns-client

## Architecture

How it works:

1. The client regularly sends a HTTP request to the URL of your private worker deployment.
2. The worker authenticates the client using a shared secret.
3. The worker uses the Cloudflare API to update DNS records to point to the IP address with which the request was made.

Key advantages:

* Eliminates reliance on 3rd-party DDNS services and services that determine client IP addresses.
* The client only needs Docker and the capability to send outbound HTTP requests to Cloudflare.
* Access to the worker is authenticated via a shared secret.
* Tokens required for DNS record updates are securely stored as worker secrets and never leave Cloudflare.
* Targeted DNS records can be set directly through the Cloudflare dashboard, without accessing the client.
  The client has no knowledge of the DNS settings.

Limitations:

* Support for managing multiple DNS zones or DNS records via a single worker is not yet implemented.
* Only `A` records are currently implemented (i.e., no IPv6 support yet).

## Deployment

### Worker

Make sure you have:

* Node.js 20 or later and npm installed
* A Cloudflare account with a DNS zone

Follow the [Workers Get Started guide](https://developers.cloudflare.com/workers/get-started/dashboard/) to create a
new Cloudflare Worker for your account.

Configure the following variables:

* `DDNS_SECRET` (secret): The secret with which clients will authenticate themselves.
  Generating a high-entropy random string is recommended.
* `CLOUDFLARE_API_TOKEN` (secret): A Cloudflare access token with permissions to read/write DNS zones.
  Limiting the token's scope to the targeted DNS zone is recommended.
* `CLOUDFLARE_ZONE_ID` (text): ID of the targeted DNS zone.
  Find this on your domain's "Overview" page on the Cloudflare dashboard.
* `CLOUDFLARE_RECORD_NAME` (text): The domain/subdomain to manage within the DNS zone, e.g., `ddns.example.com`.

Then deploy the worker code:

```sh
npm install && npm run deploy
```

### Client

The client is published as a Docker image: [meyfa/ddns-client](https://hub.docker.com/r/meyfa/ddns-client).

Its configuration must be specified via environment variables:

* `DDNS_URL`: URL of your worker, e.g., `https://ddns.example.workers.dev`.
* `DDNS_SECRET`: The shared secret (identical to the one configured on the worker).
* Optional - `DDNS_UPDATE_INTERVAL`: Number of seconds between requests. Defaults to 300.
* Optional - `DDNS_REQUEST_TIMEOUT`: Timeout in seconds for requests to the worker. Defaults to 30.

Example:

```sh
docker run --detach --restart=unless-stopped \
    --cap-drop=all --security-opt=no-new-privileges --read-only \
    --env=DDNS_URL=https://ddns.example.workers.dev \
    --env=DDNS_SECRET=your-shared-secret \
    meyfa/ddns-client:latest
```

Compose example:

```yaml
services:
  ddns-client:
    image: meyfa/ddns-client:latest
    container_name: ddns-client
    restart: unless-stopped
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges
    read_only: true
    environment:
      DDNS_URL: https://ddns.example.workers.dev
      DDNS_SECRET: "$DDNS_SECRET"
    networks:
      - internal

networks:
  internal:
```

## Development

Install dependencies:

```sh
npm install
```

Run linting:

```sh
npm run lint
```

Build the client without Docker:

```sh
npm run build
```

Build the client Docker image:

```sh
docker build --tag=ddns-client --file=client/Dockerfile ./
```

Deploy the worker:

```sh
npm run deploy
```

## Legal

This project is licensed under the terms of the MIT License.
See the accompanying LICENSE file.

Cloudflare is a trademark of Cloudflare, Inc. This project is neither affiliated with nor endorsed by Cloudflare, Inc.
