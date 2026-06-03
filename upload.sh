# Quick and dirty upload (no hidden dirs or files)
rsync -avz --exclude ".*" --exclude "__pycache__" --exclude ".log" --exclude "mock-canvas/" \
  . "$USER@gpu2:~/ctm_project/ctm_quiz_litbff"
