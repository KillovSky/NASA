const https = require('https')
const httpcodes = require('./codes.json')

// Cria a função de módulo e faz a correção dos valores 'null' direto na exports
exports.APOD = (
	api_key = 'DEMO_KEY',
	date = ''
) => {

	// Faz uma promise com a função para funcionar perfeitamente
	return new Promise((resolve, reject) => {

		// Cria a object de return em casos de erros, não afetando o usuario mas permitindo que ele saiba quando der erro
		let response = {
			"key": api_key,
			"date": date,
			"error": true,
			"dev_msg": "No commentary",
			"error_msg": "There are no apparent errors, ignore this message.",
			"code": 0,
			"explain": httpcodes['0'],
			"headers": 'none',
			"nasa": {
				"copyright": "Daniel Korona",
				"date": "2021-08-16",
				"explanation": "This was an unusual sky. It wasn't unusual because of the central band the Milky Way Galaxy, visible along the image left.  Most dark skies show part of the Milky Way. It wasn't unusual because of the bright meteor visible on the upper right. Many images taken during last week's Perseid Meteor Shower show meteors, although this Perseid was particularly bright. This sky wasn't unusual because of the red sprites, visible on the lower right. Although this type of lightning has only been noted in the past few decades, images of sprites are becoming more common. This sky wasn't unusual because of the nova, visible just above the image center. Novas bright enough to be seen with the unaided eye occur every few years, with pictured Nova RS Ophiuchus discovered about a week ago.  What was most unusual, though, was to capture all these things together, in a single night, on a single sky.  The unusual sky occurred above Zacatecas, Mexico.   Notable APOD Image Submissions: Perseid Meteor Shower 2021",
				"hdurl": "https://apod.nasa.gov/apod/image/2108/PerseidNovaSprites_Korona_960.jpg",
				"media_type": "image",
				"service_version": "v1",
				"title": "Perseid Meteor, Red Sprites, and Nova RS Ophiuchus",
				"url": "https://apod.nasa.gov/apod/image/2108/PerseidNovaSprites_Korona_960.jpg"
			}
		};

		// Caso a data tenha sido enviada incorretamente
		if (!date.includes('-')) {
			date = '';
		}

		// Verifica se a data está correta /2x
		// A data pode sair incorreta na correção caso o dia seja menor que o valor do mês
		// Não achei formas de dar parse no dia e mês da data pois existem varias combinações
		if (date !== '' && date !== null && date.includes('-')) {
			let temp_date = date.split('-');
			let corrected_date = date.split('-');
			let today_date = new Date();
			let worked_date = new Date(date);
			today_date = today_date.toISOString().split('T')[0];
			today_date = today_date.split('-');

			// Caso a data tenha a predefinição
			if (temp_date.length == 3) {

				// A NASA possui informações em 1995, mas não no ano todo, então limitei a 1996
				if (temp_date[0].length !== 4 || temp_date[1].length !== 2 || temp_date[2].length !== 2 || temp_date[0].length == 4 && temp_date[0] > today_date[0] || temp_date[1].length == 2 && temp_date[1] > 12 || temp_date[2].length == 2 && temp_date[2] > 31 || temp_date[0].length == 4 && temp_date[0] < 1996 || temp_date[1].length == 2 && temp_date[1] < 1 || temp_date[2].length == 2 && temp_date[2] < 1) {

					// Fixa o ano
					corrected_date[0] = temp_date.filter(i => i.length == 4)[0] || today_date[0];
					temp_date.splice(temp_date.indexOf(corrected_date[0]), 1); // Remove o valor para evitar uso novo dele

					// Fixa o mês
					corrected_date[1] = temp_date.filter(i => i <= 12)[0] || today_date[1];
					temp_date.splice(temp_date.indexOf(corrected_date[1]), 1);

					// Fixa o dia
					corrected_date[2] = temp_date.filter(i => i <= 28)[0] || today_date[2];

				} else if (worked_date == 'Invalid Date') {
					corrected_date = today_date.join('-');
				}

				// Verifica se a pessoa não pediu por uma data futura
				if (corrected_date[0] > today_date[0]) {
					corrected_date[0] = today_date[0]; // Ano
				} else if (corrected_date[0] == today_date[0] && corrected_date[1] > today_date[1]) {
					corrected_date[1] = today_date[1]; // Mês
				} else if (corrected_date[0] == today_date[0] && corrected_date[1] == today_date[1] && corrected_date[2] > today_date[2]) {
					corrected_date[2] = today_date[2]; // Dia
				}

				// Finaliza a data
				date = corrected_date.join('-');

			} else {
				// Usa a data do dia
				date = today_date.join('-');
				response['dev_msg'] = 'Invalid date, please insert at this format -> YYYY-MM-DD';
			}
		}

		// Caso a data não seja inserida
		if (date == '' || date == null) {
			let temp_date = new Date();
			date = temp_date.toISOString().split('T')[0];
		}

		// Opções de acesso na API
		let options = {
			hostname: 'api.nasa.gov',
			path: `/planetary/apod?api_key=${api_key}&date=${date}`,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		};

		// Try - Catch para caso dê um erro pior
		try {

			// Let para obter a chunk da requisição
			let data = '';

			// Faz a requisição na API
			const req = https.get(options, function(res) {

				// Edita a object padrão de casos de erro
				response['code'] = res.statusCode;
				response['explain'] = httpcodes[res.statusCode];
				response['headers'] = res.headers;

				// Recebe a chunk da API
				res.on('data', function(chunk) {
					data += chunk;
				});

				// Em caso de falhas
				req.on("error", function(err) {
					response['error'] = true;
					response['code'] = err.code;
					response['error_msg'] = err.message;
					return resolve(response);
				});

				// Finaliza pois o resultado foi completamente recebido
				res.on('end', function() {
					response['error'] = false;
					response['nasa'] = JSON.parse(data);
					response['date'] = response['nasa']['date'];
					return resolve(response);
				});
			})

			// Em caso de falhas 2x
			req.on("error", function(err) {
				response['error'] = true;
				response['code'] = err.code;
				response['error_msg'] = err.message;
				return resolve(response);
			});

			// Finaliza a requisição
			req.end();
			
		} catch (error) {
			response['error'] = true;
			response['code'] = error.code;
			response['error_msg'] = error.message;
			return resolve(response);
		}
		
	})

}