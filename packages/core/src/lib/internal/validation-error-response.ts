import middy from '@middy/core';

export const ValidationErrorResponse = {
	onError: (request: middy.Request<any, any, Error, any>) => {
		const {response} = request;
		if (response) {
			const error = <any>request.error;
			if (response.statusCode != 400) return;
			if (!error.expose || !error.cause) return;
			response.headers['Content-Type'] = 'application/json';
			response.body = JSON.stringify({
				message: response.body,
				data: error.cause,
			});
		}
	},
};
