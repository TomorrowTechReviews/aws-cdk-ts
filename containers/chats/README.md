# Container with REST API and WebSockets for chats

Environment variables

- `RDS_CREDENTIALS` -
- `RDS_PROXY_HOST` - used with `RDS_CREDENTIALS`
- `DATABASE_URL` - used if `RDS_CREDENTIALS` not set
- `AWS_USER_POOL_ID` -
- `AWS_USER_POOL_CLIENT_ID` -
- `AWS_REGION` -
- `HOST` - FastAPI Server host (Default: 0.0.0.0)
- `PORT` - FastAPI Server post (Default: 80)

Create network

```bash
docker network create chat
```

Run PostgreSQL container

```bash
docker run --name postgres --network chat -e POSTGRES_PASSWORD=pass -p 5432:5432 -d postgres
```

Build container

```bash
docker build -t chat .
or
docker buildx build --platform linux/amd64 -t chat .
or
docker buildx build --platform linux/arm64 -t chat .
```

Run container

```bash
docker run \
--network chat \
--name chat \
-d \
-p 80:80 \
-e DATABASE_URL=postgresql://user:pass@postgres:port/db \
-e AWS_USER_POOL_ID= \
-e AWS_USER_POOL_CLIENT_ID= \
-e AWS_REGION= \
chat
```
