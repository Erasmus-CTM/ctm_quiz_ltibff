# LTI-bff integration for a simple browser based quiz

This is a "Backend For Frontend" that can serve a quiz (https://github.com/Erasmus-CTM/py-exercise), with a LMS (Canvas) integration.

**WARNING** This is a proof of concept, which should be reviewed and improved before real use (see Issues below).

## Usage

### Configuration in canvas

- Currently uses manual JSON method. There is a python script that helps generate the configuration. 

### Server setup

- needs Mongo DB. Docker works fine.
- needs HTTPS. For development ngrok (`ngrok http 3000`) was pretty convenient.
- needs a server. For development `npm run dev` (inside `tmux`) works fine.

### Making an assignment

- click create assignment
- pick "external tool"
- choose this thing
- An iframe with the "teacher UI" should show. 
- Confirm and complete the setup.

- Tip: When testing the quiz in canvas use "student view". If a teacher submits quiz grading doesn't work.


### Misc

Inspect keys:
```
http://localhost:3001/lti/jwks
```

## Inspiration 

- [ltijs github](https://github.com/Cvmcosta/ltijs/tree/master)
- [Medium, Siddharth Roychoudhury](https://medium.com/@debu2in/implementing-ltiv1-3-using-ltijs-1ab38ab87567)
- [canvas LTI overview](https://documentation.instructure.com/doc/api/file.lti_launch_overview.html)


## Issues

- It currently only displays a single quiz (`process.env.QUIZ_HTML_PATH`), so we would need teacher UI for quiz selection or file upload.
- We should use `onConnect` and `onDeepLinking` callbacks, rather than handling it all in our own `get(/lti/launch)`.
- Authentication: We are currently sending the LTI key (`ltik`) inlined in HTML to the client. Meaning that students can extract the key, and submit multiple times, or share it. *Suggested improvement*: keep the `ltik` stored in session on the server, and let Express handle the client auth. E.g. using the `requireSession` middleware, based on seesion cookies.
- Currently uses the node dev server. Real use should have a proper production server. And perhaps Pm2. 
- I've used a free ngrok domain. For production we should have HTTPS on our own server.
- I couldn't find typing for ltijs, so there is a lot of `any` in the code.
- Quarto quiz "works" with just the HTML, but to enjoy prettier css and full functionality it needs to serve the `*_files/`. Would be clean if one could do that without duplicating it per quiz...


Session auth idea
``` ts
// On launch
app.post('/lti', provider.app, async (req, res) => {
  const ltik = res.locals.ltik; // from ltijs middleware
  const userId = res.locals.token.user; // from the validated token

  // Store ltik server-side, keyed to a session
  req.session.ltik = ltik;
  req.session.userId = userId;
  req.session.submitted = false;

  res.sendFile(QUIZ_HTML); // no ltik injection needed
});

// On submit
app.post('/lti/api/submit', requireSession, async (req, res) => {
  if (req.session.submitted) {
    return res.status(409).json({ error: 'Already submitted' });
  }

  const ltik = req.session.ltik; // retrieved server-side
  // ... forward to Canvas grades API using ltik
  req.session.submitted = true;
});
```