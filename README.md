# LTI-bff integration for a simple browser based quiz

Somwewhat vibe-coded MVP.

Example launch:
```
http://localhost:3001/lti/launch-as?user_id=1&redirect_uri=http://localhost:3000/
```


Inspect keys:
```
http://localhost:3001/lti/jwks
```

## Inspiration 

- [ltijs github](https://github.com/Cvmcosta/ltijs/tree/master)
- [Medium, Siddharth Roychoudhury](https://medium.com/@debu2in/implementing-ltiv1-3-using-ltijs-1ab38ab87567)
- [canvas LTI overview](https://documentation.instructure.com/doc/api/file.lti_launch_overview.html)


## Issues

- We should use `onConnect` and `onDeepLinking` callbacks, rather than handling it all in our own `get(/lti/launch)`.
- I couldn't find typing for ltijs, so there is a lot of `any` in the code.

## Tricks

- When testing the quiz in canvas use "student view". If a teacher submits quiz grading doesn't work.