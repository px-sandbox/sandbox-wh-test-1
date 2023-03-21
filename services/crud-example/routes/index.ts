export const crudRoutes = {
  'GET    /crud-test': 'functions/list.main',
  'POST   /crud-test': 'functions/create.main',
  'GET    /crud-test/{id}': 'functions/get.main',
  'PUT    /crud-test/{id}': 'functions/update.main',
  'DELETE /crud-test/{id}': 'functions/delete.main',
};
