import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, vimeoThumbnail, youtubeThumbnail } from '../dist/index.js';

test('youtubeThumbnail: reconhece os formatos de URL', () => {
  const expected = 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg';
  assert.equal(youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), expected);
  assert.equal(youtubeThumbnail('https://youtu.be/dQw4w9WgXcQ'), expected);
  assert.equal(youtubeThumbnail('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0'), expected);
  assert.equal(youtubeThumbnail('//www.youtube.com/embed/dQw4w9WgXcQ'), expected);
  assert.equal(youtubeThumbnail('https://example.com/sem-id'), false);
});

test('youtubeThumbnail: entrada enorme não trava', () => {
  const start = Date.now();
  youtubeThumbnail(`https://youtu.be/${'a'.repeat(300_000)}?x=`);
  assert.ok(Date.now() - start < 1000);
});

test('vimeoThumbnail: usa o último segmento numérico do caminho', () => {
  const expected = 'https://vumbnail.com/927766087.jpg';
  assert.equal(vimeoThumbnail('https://vimeo.com/927766087'), expected);
  assert.equal(vimeoThumbnail('https://player.vimeo.com/video/927766087'), expected);
  assert.equal(vimeoThumbnail('https://vimeo.com/groups/nome/videos/927766087'), expected);
  assert.equal(vimeoThumbnail('https://vimeo.com/927766087?x=1'), expected);
  assert.equal(vimeoThumbnail('https://example.com/927766087'), false);
});

test('vimeoThumbnail: entrada cheia de barras não trava', () => {
  const start = Date.now();
  vimeoThumbnail(`vimeo${'/'.repeat(80_000)}1`);
  assert.ok(Date.now() - start < 1000);
});

test('htmlToText: tira tags, decodifica entidades e converte <br>', () => {
  assert.equal(htmlToText('<p>Olá, <b>mundo</b> &amp; cia</p>'), 'Olá, mundo & cia');
  assert.equal(htmlToText('um<br>dois<br/>três'), 'um\ndois\ntrês');
  assert.equal(htmlToText('It&#039;s &#x41;&nbsp;B'), "It's A B");
  assert.equal(htmlToText('&naoexiste; fica'), '&naoexiste; fica');
});

test('htmlToText: não vira tag o que veio como entidade', () => {
  assert.equal(htmlToText('&lt;b&gt;texto&lt;/b&gt;'), '<b>texto</b>');
});

test('htmlToText: tags aninhadas ou quebradas não deixam tag para trás', () => {
  assert.equal(htmlToText('<<b>script>alert(1)<</b>/script>'), 'script>alert(1)/script>');
  assert.equal(htmlToText('<scr<b>ipt>x'), 'ipt>x');
  for (const input of ['<<b>script>', '<<<a>>>img src=x onerror=y>', '<a<b>>c']) {
    assert.doesNotMatch(htmlToText(input), /<[a-z/!?]/i, input);
  }
});

test('htmlToText: "<" solto em texto comum é preservado e tag sem fechamento é descartada', () => {
  assert.equal(htmlToText('1 < 2 e 3 > 2'), '1 < 2 e 3 > 2');
  assert.equal(htmlToText('antes <a href="x'), 'antes');
});

test('htmlToText: entrada enorme sem fechamento não trava', () => {
  const start = Date.now();
  htmlToText(`<a ${'<'.repeat(100_000)}`);
  assert.ok(Date.now() - start < 1000);
});
