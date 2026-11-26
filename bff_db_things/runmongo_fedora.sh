sudo docker run -d \
  -p 27017:27017 \
  --name mongodb \
  --env GLIBC_TUNABLES="glibc.cpu.hwcaps=-SHSTK" \
  mongo:latest