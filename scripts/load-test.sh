wrk -c 50 -t 20 -d 10m --latency --timeout 30 \
-H "Authorization: Bearer <Cognito ID Token>" \
https://api.tomorrowtechreviews.com/v1/chats