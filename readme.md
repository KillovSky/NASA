### O que este módulo faz  
- Ele acessa a APOD, uma das APIS da NASA, no caso de erros, ele retorna um valor padrão, fazendo com que os erros sejam enviados ao usuário com detalhes sobre o motivo, mas que o processo possa continuar sem problemas.  
  
### Vantagens de usar uma `API-KEY`:  
- Você possui mais limites de uso da API.  
  
### Onde obter uma `API-KEY` **gratuitamente**:  
- Você pode obter uma chave de acesso indo diretamente ao site da NASA, basta [clicar aqui](https://api.nasa.gov/).  
  
### Como testar este módulo:  
- Basta abrir um terminal na pasta do módulo e digitar:  
  
```bash  
npm test
```  
  
### Como utilizar este módulo:  
- Existem diversas formas de utilizar, mas como se trata de um script que faz uso de `Promises`, irei dar dois exemplos que funcionam bem, lembrando, você pode ignorar a `API-KEY` e a `data`, pois também funciona sem especificar ambos.  
  
### Exemplo 1 | Usando 'then'  
  
```javascript  
const NASA = require('@killovsky/nasa')
NASA.APOD('API-KEY', 'DATA EM YYYY-MM-DD').then(data => {
	// Faça seu código baseado na object 'data' aqui
	// Exemplo: console.log(data)
})
```  
  
### Exemplo 2 | Usando 'async/await'  
  
```javascript  
const NASA = require('@killovsky/nasa')
const data = await NASA.APOD('API-KEY', 'DATA EM YYYY-MM-DD')
// Faça seu código aqui usando a const 'data'
// Exemplo: console.log(data)
```  
  
### Exemplo de uso para mostrar a resposta no terminal  
  
```javascript  
const NASA = require('@killovsky/nasa')
const data = await NASA.APOD('DEMO_KEY', '2022-06-26')
console.log(data)
```  
  
### O que você receberá na execução:  
  
<details>
  <summary><h4>[Clique para exibir] - O Módulo te retornará o seguinte JSON por padrão:</h4></summary>
  
```JSON  
{
	"key": "String | API-KEY",
	"date": "String | Data [YYYY-MM-DD]",
	"error": "true | false",
	"dev_msg": "String | Mensagem de Erro [Caso a data não esteja OK]",
	"error_msg": "String | Mensagem de erro da requisição",
	"code": "Number | String | Código de erro HTTP",
	"explain": {
		"code": "Number | String | Código escrito de HTTP",
		"why": "String | Explicação do código HTTP"
	},
	"headers": {
		"date": "String | Data escrita da requisição",
		"content-type": "String | Tipo de resposta",
		"content-length": "Number | Tamanho da resposta",
		"x-ratelimit-limit": "Number | Limites de usos da API",
		"x-ratelimit-remaining": "Number | Limites de uso restantes",
		"Outros": "E alguns outros headers, faça uma requisição para obter todos."
	},
	"nasa": {
		"copyright": "String | Nome de copyright da NASA",
		"date": "String | Data [YYYY-MM-DD]",
		"explanation": "String | Descrição do evento da NASA",
		"hdurl": "String | URL com mídia HD do evento, nem sempre disponível",
		"media_type": "String | Tipo de mídia",
		"service_version": "String | Versão da API",
		"title": "String | Titulo do evento",
		"url": "String | URL com mídia padrão do evento"
	}
}
```  
  
</details>  
  
### Exemplo de resposta real  
  
<details>  
  <summary><h4>[Clique para exibir] - Abaixo está um exemplo real do JSON acima, para ajudar a entender:</h4></summary>  
  
```JSON  
{
	"key": "API-KEY",
	"date": "2017-12-24",
	"error": false,
	"dev_msg": "No commentary",
	"error_msg": "There are no apparent errors, ignore this message.",
	"code": 200,
	"explain": {
		"code": "OK",
		"why": "The request is OK, this response depends on the HTTP method used."
	},
	"headers": {
		"date": "Sun, 26 Jun 2022 23:20:45 GMT",
		"content-type": "application/json",
		"content-length": "1207",
		"connection": "close",
		"vary": "Accept-Encoding",
		"x-ratelimit-limit": "2000",
		"x-ratelimit-remaining": "1991",
		"access-control-allow-origin": "*",
		"access-control-expose-headers": "X-RateLimit-Limit, X-RateLimit-Remaining",
		"age": "0",
		"via": "http/1.1 api-umbrella (ApacheTrafficServer [cMsSf ])",
		"x-cache": "MISS",
		"strict-transport-security": "max-age=31536000; preload"
	},
	"nasa": {
		"copyright": "Craig Bobchin",
		"date": "2017-12-24",
		"explanation": "What's happened to the sky? On Friday, the photogenic launch plume from a SpaceX rocket launch created quite a spectacle over parts of southern California and Arizona.  Looking at times like a giant space fish, the impressive rocket launch from Vandenberg Air Force Base near Lompoc, California, was so bright because it was backlit by the setting Sun. Lifting off during a minuscule one-second launch window, the Falcon 9 rocket successfully delivered to low Earth orbit ten Iridium NEXT satellites that are part of a developing global communications network. The plume from the first stage is seen on the right, while the soaring upper stage rocket is seen at the apex of the plume toward the left. Several good videos of the launch were taken.  The featured image was captured from Orange County, California, in a 2.5 second duration exposure.   Gallery: More images of the SpaceX launch",
		"hdurl": "https://apod.nasa.gov/apod/image/1712/SpaceXLaunch_Bobchin_5407.jpg",
		"media_type": "image",
		"service_version": "v1",
		"title": "SpaceX Rocket Launch Plume over California",
		"url": "https://apod.nasa.gov/apod/image/1712/SpaceXLaunch_Bobchin_960.jpg"
	}
}
```  
  
</details>  
  
### TO-DO  
- Adquirir múltiplas respostas do servidor  
- Tradução automática das respostas  
- Downloads  
  
### Suporte  
  
- Se obtiver algum problema, você pode me dizer [Reportando nas Issues](https://github.com/KillovSky/NASA/issues).  
- Confira outros projetos meus [Acessando Isto](https://github.com/KillovSky/NASA/).  
- Se gostar, doe para me ajudar a continuar desenvolvendo, mais informações [Clicando Aqui](http://htmlpreview.github.io/?https://github.com/KillovSky/iris/blob/main/.readme/donates/page.html) - [Página do Projeto Íris]  