/* EduRise internal analytics — aggregate page views only, no personal data */
(function () {
  try {
    var r = new XMLHttpRequest();
    r.open("POST", "/api/v1/analytics/track", true);
    r.setRequestHeader("Content-Type", "application/json");
    r.send(JSON.stringify({ path: location.pathname, honeypot: "" }));
  } catch (e) {}
})();
