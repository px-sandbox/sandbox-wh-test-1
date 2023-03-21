export const notesRoutes = {
  'GET /': 'functions/get.handler',
  'POST /signup': 'functions/signup.handler',
  'GET /notes': 'functions/list.handler',
  'GET /notes/{id}': 'functions/get.handler',
  'PUT /notes/{id}': 'functions/update.handler',
};
