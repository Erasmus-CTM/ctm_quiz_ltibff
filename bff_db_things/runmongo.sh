
#get credentials
set -i
source .env
set +i

sudo docker run -d -p 27017:27017  \
     -e "MONGO_INITDB_ROOT_USERNAME=$DB_USER" \
     -e "MONGO_INITDB_ROOT_PASSWORD=$DB_PASSWORD" \
     mongo
