<p align="center"><img src="https://www.nasa.gov/sites/default/files/thumbnails/image/nasa-logo-web-rgb.png" width="425" height="210" alt="nasa-logo-web-rgb.png"/></p>
<h5 align="center"><a href="https://www.nasa.gov/audience/forstudents/5-8/features/symbols-of-nasa.html/">[Source: Symbols of NASA]</a></h5>
  
### O que este módulo faz?  
- Ele acessa a [[APOD - Astronomy Picture of the Day](https://apod.nasa.gov/apod/astropix.html)], uma das API's da NASA.  
  
### Vantagens de usar uma `API-KEY`:  
- Você possui mais limites de uso da API.  
  
### Onde obter uma `API-KEY` **gratuitamente**:  
- Você pode obter uma chave de acesso indo diretamente ao site da NASA, basta [clicar aqui](https://api.nasa.gov/).  
  
### O que este módulo tem de especial?  
- Muitas coisas, afinal, isso foi feito para ter a melhor praticidade possível, confira abaixo:  
  
------  
> 1. Neste módulo, os erros não afetam o funcionamento, o que significa que apesar de qualquer erro, os valores 'sempre' estarão lá para que você não seja afetado.  
>  
> 2. Os erros serão inseridos na resposta com uma explicação sobre o que causou eles, facilitando para você entender.  
>  
> 3. Em algumas datas, a API da NASA não tem certas `keys` como `hdurl` ou `copyright`, mas eles são inseridos neste módulo, retornando `false` por padrão, caso a NASA não tenha.  
>  
> 4. Os headers estão inseridos na resposta, facilitando para saber detalhes, como a quantidade de usos restantes de sua `API-KEY`.  
>  
> 5. Não existem dependências de módulos de terceiro, tudo é feito usando o puro `Node.js`.  
>  
> 6. Cada linha do código possui uma explicação do que está rodando ou vai rodar, ou seja, o código INTEIRO é explicado, linha por linha.  
>  
> 7. Parâmetros incorretos são automaticamente corrigidos, por exemplo, corrige a `data` se mal colocada, não sofre erros por usar uma `API-KEY` inválida e muito mais.  
>  
> 8. As imagens são baixadas na melhor qualidade possível e apenas se tudo estiver OK durante a execução, evitando maiores erros.  
>  
> 9. E muitas outras coisas, confira o código para entender!  
------  
  
### Como testar este módulo:  
- Basta abrir um terminal na pasta do módulo e digitar:  
  
```bash  
npm test  
```  
  
### Como utilizar este módulo:  
- Existem diversas formas de utilizar, mas como se trata de um script que faz uso de `Promises`, irei dar dois exemplos que funcionam bem, lembrando, você pode rodar sem especificar nada pois também funciona desta forma.   
  
<details>  
<summary><code>[Clique para exibir] → Descrição de cada parâmetro da execução</code></summary>  
  
```javascript  
// Function especificada  
APOD('API_KEY', 'DATA', 'DOWNLOAD', 'LOCAL')  
  
// Function sem especificar  
APOD()  
  
/* --------------------------------- *  
* 1° - API_KEY  
* Valores: string  
* Padrão: 'DEMO_KEY'  
* ---------------------------------  
* 2° - DATA  
* Valores: string [YYYY-MM-DD]  
* Exemplo: 2022-06-27  
* Padrão: ''  
* ---------------------------------  
* 3° - DOWNLOAD  
* Valores: boolean [true, false]  
* Padrão: false  
* ---------------------------------  
* 4° - LOCAL  
* Valores: string  
* Padrão: ''  
* --------------------------------- */  
```  
  
</details>   
  
<details>  
<summary><code>Exemplos de uso:</code></summary>  
  
```javascript  
// Usando .then | Modo de uso padrão  
const NASA = require('@killovsky/nasa');  
NASA.APOD('API-KEY', 'DATA EM YYYY-MM-DD', 'DOWNLOAD', 'LOCAL').then(data => {  
	// Faça seu código baseado na object 'data' aqui  
	// Exemplo: console.log(data);  
})  
  
// Usando await [async] | Modo de uso padrão  
const NASA = require('@killovsky/nasa');  
const data = await NASA.APOD('API-KEY', 'DATA EM YYYY-MM-DD', 'DOWNLOAD', 'LOCAL');  
// Faça seu código aqui usando a const 'data'  
// Exemplo: console.log(data);  
```  
  
</details>  
  
<details>  
<summary><code>Códigos já prontos [.then]:</code></summary>  
  
```javascript  
// Código usando .then [Sem Download]  
const NASA = require('@killovsky/nasa');  
NASA.APOD('DEMO_KEY', '2022-06-26', false, false).then(data => console.log(data));  
  
// Código usando .then [Com download] [Certifique-se de que a pasta existe]  
const NASA = require('@killovsky/nasa');  
NASA.APOD('DEMO_KEY', '2022-06-26', true, './images').then(data => console.log(data));  
```  
  
</details>  
  
<details>  
<summary><code>Códigos já prontos [async/await]:</code></summary>  
  
```javascript  
// Código usando await [Sem Download]  
const NASA = require('@killovsky/nasa');  
const data = await NASA.APOD('DEMO_KEY', '2022-06-26', false, false);  
console.log(data);  
  
// Código usando .then [Com download] [Certifique-se de que a pasta existe]  
const NASA = require('@killovsky/nasa');  
const data = await NASA.APOD('DEMO_KEY', '2022-06-26', true, './images');  
console.log(data);  
  
// Se você não sabe criar uma função async ou ainda não tiver uma, use este código abaixo:  
(async () => {  
	// Cole um dos códigos com await aqui dentro  
})();  
```  
  
</details>  
  
<details>  
<summary><code>Exemplo de resultado com explicações:</code></summary>  
  
```JSON  
{  
	"key": "String | API-KEY",  
	"date": "String | Data [YYYY-MM-DD]",  
	"error": "true | false",  
	"download": "String / false | Mensagens sobre o download se requisitado",  
	"dev_msg": "String / false | Códigos de erros enviados pela NASA",  
	"data_msg": "String / false | Mensagem de Erro [Caso a data não esteja OK]",  
	"error_msg": "String / false | Mensagem de erro da requisição",  
	"best_image": "String / false | URL com a melhor imagem/thumb disponível",  
	"code": "Number | String | Código de erro HTTP",  
	"explain": {  
		"code": "Number / String | Código escrito de HTTP",  
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
		"copyright": "String / false | Copyright da imagem da NASA",  
		"date": "String / false | Data do dia dos dados da NASA",  
		"explanation": "String / false | Descrição do evento da NASA",  
		"hdurl": "String / false | URL com mídia HD do evento",  
		"thumbnail_url": "String / false | Thumbnail, caso seja um video",  
		"media_type": "String / false | Tipo de mídia",  
		"service_version": "String / false | Versão da API",  
		"title": "String / false | Titulo do evento",  
		"url": "String / false | URL com mídia padrão do evento"  
	}  
}  
```  
  
</details>  
  
<details>  
<summary><code>Exemplo utilizável de resultado:</code></summary>  
  
```JSON  
{  
	"key": "DEMO_KEY",  
	"date": "2022-06-26",  
	"error": false,  
	"download": false, 
	"dev_msg": false,  
	"data_msg": false,  
	"error_msg": false,  
	"best_image": "https://apod.nasa.gov/apod/image/1712/SpaceXLaunch_Bobchin_5407.jpg",  
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
		"explanation": "What's happened to the sky? On Friday, the photogenic launch plume from a SpaceX rocket launch created quite a spectacle over parts of southern California and Arizona. Looking at times like a giant space fish, the impressive rocket launch from Vandenberg Air Force Base near Lompoc, California, was so bright because it was backlit by the setting Sun. Lifting off during a minuscule one-second launch window, the Falcon 9 rocket successfully delivered to low Earth orbit ten Iridium NEXT satellites that are part of a developing global communications network. The plume from the first stage is seen on the right, while the soaring upper stage rocket is seen at the apex of the plume toward the left. Several good videos of the launch were taken. The featured image was captured from Orange County, California, in a 2.5 second duration exposure. Gallery: More images of the SpaceX launch",  
		"hdurl": "https://apod.nasa.gov/apod/image/1712/SpaceXLaunch_Bobchin_5407.jpg",  
		"thumbnail_url": false,  
		"media_type": "image",  
		"service_version": "v1",  
		"title": "SpaceX Rocket Launch Plume over California",  
		"url": "https://apod.nasa.gov/apod/image/1712/SpaceXLaunch_Bobchin_960.jpg"  
	}  
}  
```  
  
</details>   
  
### TO-DO  
- [ ] Adquirir múltiplas respostas do servidor  
- [ ] Tradução automática das respostas  
- [ ] Informações sobre o Download  
- [ ] 'Portar e Corrigir todos' os recursos da API  
- [x] Downloads  
  
### Suporte  
  
- Se obtiver algum problema, você pode me dizer [Reportando nas Issues](https://github.com/KillovSky/NASA/issues).  
- Confira outros projetos meus [Acessando Isto](https://github.com/KillovSky/NASA/).  
- Se gostar, doe para me ajudar a continuar desenvolvendo, mais informações [Clicando Aqui](http://htmlpreview.github.io/?https://github.com/KillovSky/iris/blob/main/.readme/donates/page.html) - [Página do Projeto Íris]
