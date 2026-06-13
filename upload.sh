# Quick and dirty upload 
rsync -avz --exclude ".*/" --exclude "node_modules/"  --exclude "__pycache__" --exclude ".log" --exclude "mock-canvas/" \
  . "$USER@gpu2:~/ctm_project/ctm_quiz_litbff"
