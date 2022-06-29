const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const httpcodes = require('./codes.json');
const default_nasa = require('./default.json');

/*######################################################################################
#
# Por que fiz a linguagem em inglês? 
# R: Pois eu gosto deste idioma e quis seguir o padrão como quase todos os outros devs.
#
# Esse código pode ser copiado para criar algo diferente, novo, superior ou etc?
# R: É claro! Mas você >PRECISA< manter o copyright, leia mais da licença abaixo.
#
########################################################################################
#
#	MIT License
#
#	Copyright (c) 2022 KillovSky - Lucas R.
#
#	Permission is hereby granted, free of charge, to any person obtaining a copy
#	of this software and associated documentation files (the "Software"), to deal
#	in the Software without restriction, including without limitation the rights
#	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
#	copies of the Software, and to permit persons to whom the Software is
#	furnished to do so, subject to the following conditions:
#
#	The above copyright notice and this permission notice shall be included in all
#	copies or substantial portions of the Software.
#
#	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
#	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
#	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
#	SOFTWARE.
#
######################################################################################*/

/* Cria a função de módulo e faz a correção dos valores 'null' direto na exports */
exports.APOD = (
	api_key = 'DEMO_KEY',
	date = '',
	download = false,
	download_path = ''
) => {

	/* Faz uma promise com a função para funcionar perfeitamente */
	return new Promise((resolve, reject) => {

		/* Cria a object de return em casos de erros, não afetando o usuario mas permitindo que ele saiba quando der erro */
		let response = default_nasa[Math.floor(Math.random() * default_nasa.length)];

		/* Caso a data tenha sido enviada incorretamente */
		if (!date.includes('-')) {
			date = '';
		};

		/* Caso o local não seja especificado */
		if (download_path == '' || download_path == null) {
			if (!fs.existsSync('./NASA_IMAGES')) {
				fs.mkdirSync('./NASA_IMAGES/');
			}
			download_path = './NASA_IMAGES/';
		};

		/* Verifica se a data está correta /2x */
		/* A data pode sair incorreta na correção caso o dia seja menor que o valor do mês */
		/* Não achei formas de dar parse no dia e mês da data pois existem varias combinações */
		if (date !== '' && date !== null && date.includes('-')) {
			let temp_date = date.split('-');
			let corrected_date = date.split('-');
			let today_date = new Date();
			let worked_date = new Date(date);
			today_date = today_date.toISOString().split('T')[0];
			today_date = today_date.split('-');

			/* Caso a data tenha a predefinição */
			if (temp_date.length == 3) {

				/* A NASA possui informações em 1995, mas não no ano todo, então limitei a 1996 */
				if (temp_date[0].length !== 4 || temp_date[1].length !== 2 || temp_date[2].length !== 2 || temp_date[0].length == 4 && temp_date[0] > today_date[0] || temp_date[1].length == 2 && temp_date[1] > 12 || temp_date[2].length == 2 && temp_date[2] > 31 || temp_date[0].length == 4 && temp_date[0] < 1996 || temp_date[1].length == 2 && temp_date[1] < 1 || temp_date[2].length == 2 && temp_date[2] < 1) {

					/* Fixa o ano */
					corrected_date[0] = temp_date.filter(i => i.length == 4)[0] || today_date[0];
					temp_date.splice(temp_date.indexOf(corrected_date[0]), 1); /* Remove o valor para evitar uso novo dele */

					/* Fixa o mês */
					corrected_date[1] = temp_date.filter(i => i <= 12)[0] || today_date[1];
					temp_date.splice(temp_date.indexOf(corrected_date[1]), 1);

					/* Fixa o dia */
					corrected_date[2] = temp_date.filter(i => i <= 31)[0] || today_date[2];
					
				};

				/* Verifica se a pessoa não pediu por uma data futura ou nula */
				/* Verifica novamente o ano */
				if (corrected_date[0] > today_date[0] || corrected_date[0] < 1996) {
					let inc_year = `Invalid year, the minimum year is "1996" and the maximum is ${today_date[0]}, using ${today_date[0]} in request...`;
					response['data_msg'] = response['data_msg'] == false ? inc_year : response['data_msg'] + '\n' + inc_year;
					corrected_date[0] = today_date[0]; /* Ano */
				};

				// Verifica novamente o mês
				if (corrected_date[0] == today_date[0] && corrected_date[1] > today_date[1] || corrected_date[1] <= 00) {
					let inc_month = `Invalid month, you set a future date, the maximum month in this year is ${today_date[1]}, using ${today_date[1]} in request...`;
					response['data_msg'] = response['data_msg'] == false ? inc_month : response['data_msg'] + '\n' + inc_month;
					corrected_date[1] = today_date[1]; /* Mês */
				};

				// Verifica novamente o dia
				if (corrected_date[0] == today_date[0] && corrected_date[1] == today_date[1] && corrected_date[2] > today_date[2] || corrected_date[2] <= 00) {
					let inc_day = `Invalid day, you set a future date, the maximum day in this month is ${today_date[2]}, using ${today_date[2]} in request...`;
					response['data_msg'] = response['data_msg'] == false ? inc_day : response['data_msg'] + '\n' + inc_day;
					corrected_date[2] = today_date[2]; /* Dia */
				};

				/* Finaliza a data */
				date = corrected_date.join('-');

				/* Caso a data ainda seja invalida após tudo isso, define como a de 'hoje' */
			} else if (worked_date == 'Invalid Date') {
				date = today_date.join('-');
				response['data_msg'] = 'Invalid date, please insert at this format -> YYYY-MM-DD';
			} else {
				date = today_date.join('-');
				response['data_msg'] = 'Unknown error, check if the date is set in this format -> YYYY-MM-DD';
			};
		};

		/* Caso a data não seja inserida */
		if (date == '' || date == null) {
			let temp_date = new Date();
			date = temp_date.toISOString().split('T')[0];
		};

		/* Opções de acesso na API */
		let options = {
			hostname: 'api.nasa.gov',
			path: `/planetary/apod?api_key=${api_key}&date=${date}`,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		};

		/* Try - Catch para caso dê um erro pior */
		try {

			/* Let para obter a chunk da requisição */
			let data = '';

			/* Faz a requisição na API */
			const req = https.get(options, function(res) {

				/* Edita a object padrão de casos de erro */
				response['code'] = res.statusCode;
				response['explain'] = httpcodes[res.statusCode];
				response['headers'] = res.headers;

				/* Recebe a chunk da API */
				res.on('data', function(chunk) {
					data += chunk;
				});

				/* Em caso de falhas */
				req.on("error", function(err) {
					response['error'] = true;
					response['code'] = err.code;
					response['error_msg'] = err.message;
					return resolve(response);
				});

				/* Finaliza pois o resultado foi completamente recebido */
				res.on('end', function() {

					/* Cria uma let temporariamente para filtrar as objects */
					let NASA_DATA = JSON.parse(data);

					/* Verifica se obteve uma das 2 formas de erro, se sim, não edita o JSON, garantindo funcionalidade mesmo com erro */
					if (Object.keys(NASA_DATA).includes('code')) {
						response['error'] = true;
						response['code'] = NASA_DATA['code'];
						response['error_msg'] = NASA_DATA['msg'];
						response['explain'] = httpcodes[response['code']];
					} else if (Object.keys(NASA_DATA).includes('error')) {
						response['error'] = true;
						response['error_msg'] = NASA_DATA['error']['message'];
						response['dev_msg'] = NASA_DATA['error']['code'];
					} else {

						/* Se funcionou, faz a correção do JSON e envio da data requisitada */
						response['error'] = false;
						response['nasa'] = NASA_DATA;

						/* Verifica se possui a 'date', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('date')) {
							response['nasa']['date'] = false;
						};

						/* Verifica se possui a 'explanation', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('explanation')) {
							response['nasa']['explanation'] = false;
						};

						/* Verifica se possui a 'HDURL', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('hdurl')) {
							response['nasa']['hdurl'] = false;
						};

						/* Verifica se possui a 'media_type', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('media_type')) {
							response['nasa']['media_type'] = false;
						};

						/* Verifica se possui a 'service_version', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('service_version')) {
							response['nasa']['service_version'] = false;
						};

						/* Verifica se possui a 'title', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('title')) {
							response['nasa']['title'] = false;
						};

						/* Verifica se possui a 'url', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('url')) {
							response['nasa']['url'] = false;
						};

						/* Verifica se possui a 'copyright', se não tiver insere */
						if (!Object.keys(response['nasa']).includes('copyright')) {
							response['nasa']['copyright'] = false;
						};

						/* Verifica se possui a 'thumbnail_url' */
						if (!Object.keys(response['nasa']).includes('thumbnail_url')) {

							/* Verifica se é um video pra ter certeza */
							if (response['nasa']['media_type'] == 'video') {

								/* Verifica se é YouTube */
								if (response['nasa']['url'].includes('youtu')) {

									/* Verifica se o URL possui o protocolo, senão insere (algumas datas não possuem) */
									if (response['nasa']['url'].startsWith('//')) {
										response['nasa']['url'] = 'https:' + response['nasa']['url'];
									};

									/* Adquire o ID do video do YouTube e insere na JSON, se falhar retorna false */
									let youtube_ID = response['nasa']['url'].match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
									if (youtube_ID[2] !== null) {
										response['nasa']['thumbnail_url'] = "https://img.youtube.com/vi/" + youtube_ID[2] + "/0.jpg";
									} else {
										response['nasa']['thumbnail_url'] = false;
									};

									/* Verifica se é Vimeo */
								} else if (response['nasa']['url'].includes('vimeo')) {

									/* Adquire a ID do video do Vimeo e insere na JSON, se falhar retorna false */
									let vimeo_ID = /vimeo.*\/(\d+)/i.exec(response['nasa']['url']);
									if (vimeo_ID[1] !== null) {
										response['nasa']['thumbnail_url'] = 'https://vumbnail.com/' + vimeo_ID[1] + '.jpg';
									} else {
										response['nasa']['thumbnail_url'] = false;
									};
								};

								/* Caso não seja video, define como false para não faltar na JSON */
							} else {
								response['nasa']['thumbnail_url'] = false;
							};
						};

						/* Insere a data do dia */
						let today = new Date();
						response['date'] = today.toISOString().split('T')[0];
						
					};

					/* Configura o melhor link de imagem ou thumbnail para facilitar */
					if (response['nasa']['media_type'] == 'image') {
						if (response['nasa']['hdurl'] !== false) {
							response['best_image'] = response['nasa']['hdurl'];
						} else {
							response['best_image'] = response['nasa']['url'];
						};
					} else if (response['nasa']['thumbnail_url'] !== false) {
						response['best_image'] = response['nasa']['thumbnail_url'];
					} else {
						response['best_image'] = false;
					};

					/* Faz o download da imagem ou thumb ou imagem se o usuário quiser */
					if (download) {

						/* checa se o local especificado é válido */
						if (fs.existsSync(path.normalize(download_path))) {

							/* Local de download normalizado */
							let down_path = path.normalize(download_path + response['nasa']['date'] + '.jpg');

							/* Checa se a imagem já foi baixada */
							if (!fs.existsSync(down_path)) {

								/* Se tiver um link a baixar, começa as etapas de download */
								if (response['best_image'] !== false) {

									/* Caso a resposta envie antes da hora, avisará que está baixando (Acontece em imagens pesadas) */
									response['download'] = 'The image is being downloaded, this may take a while...';

									/* Define o tipo de download a ser feito */
									const photo = response['best_image'].includes('https') ? https : http;

									/* Cria o arquivo no local requisitado */
									let file_created = fs.createWriteStream(down_path);

									/* Baixa o arquivo */
									const getdown = photo.get(response['best_image'], function(res) {
										res.pipe(file_created);
									});

									/* Quando finalizar a escrita do arquivo em disco */
									file_created.on('finish', function() {
										response['download'] = 'Download finished, appear no errors.';
										return resolve(response);
									});

									/* Quando finalizar o request, mas não terminará o processo (normalmente) até que o 'file_created' termine */
									getdown.on('end', function() {
										response['download'] = 'Download finished, appear no errors.'
									});

									/* Caso der erro no download, remove o arquivo para evitar corrupção e continua a execução */
									getdown.on('error', function(err) {
										fs.unlinkSync(down_path);
										response['download'] = err.message;
										return resolve(response);
									});

									/* Caso a escrita do arquivo em disco obtenha erros, remove o arquivo para evitar corrupção e continua a execução */
									file_created.on('error', function(err) {
										fs.unlinkSync(down_path);
										response['download'] = err.message;
										return resolve(response);
									});

									/* Finaliza o request */
									getdown.end();

									/* Caso não obtenha imagens para baixar define a mensagens explicando abaixo */
								} else {
									response['download'] = 'Apparently there are no images to download in the data sent by NASA.';
								};

								/* Caso a imagem baixada já exista define a mensagem abaixo */
							} else {
								response['download'] = 'The image was downloaded before, you can check in the specified path.';
							};

							/* Caso o local especificado não exista, a pasta não será criada por questões de segurança e locais de uso como: */
							/* system32, windows, temp, bin... */
						} else {
							response['download'] = 'The specified path does not exist, you can try to download it by going to the link in the JSON.';
						};
						
					};

					/* Finaliza o request e retorna o JSON */
					return resolve(response);
					
				});
			});

			/* Em caso de falhas 2x */
			req.on("error", function(err) {
				response['error'] = true;
				response['code'] = err.code;
				response['error_msg'] = err.message;
				return resolve(response);
			});

			/* Finaliza a requisição */
			req.end();

			/* Caso der erro em alguma coisa, não afeta o resultado e cai no catch abaixo */
		} catch (error) {
			response['error'] = true;
			response['code'] = error.code;
			response['error_msg'] = error.message;
			return resolve(response);
		};
		
	});

};