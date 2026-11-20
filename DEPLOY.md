# Публикация

Приложение отдаётся как набор статических файлов. Node.js нужен только чтобы собрать проект, на сервере его запускать не надо.

Сборка лежит в каталоге `build`. В `package.json` указано `"homepage": "./"`, поэтому одни и те же файлы открываются и с корня домена, и из подкаталога. Адреса упражнений выглядят так: `https://<хост>/#/bwc`, `/#/num`, `/#/twodigit`, `/#/dice`, `/#/random`. Серверу достаточно отдать `index.html` и файлы рядом с ним: отдельные правила для этих адресов не нужны.

Установка как приложение и service worker работают только по HTTPS. По обычному HTTP откроется сайт, но браузер не зарегистрирует `service-worker.js`.

Перед публикацией:

```bash
npm install
npm run build
```

Проверьте каталог `build` локально любым статическим сервером. Команда `npm start` для этого не подходит: она поднимает режим разработки.

## GitHub Pages и поддомен

Репозиторий: `git@github.com:viterobk/intuition-training.git`. Команда `npm run deploy` сначала собирает проект, затем публикует содержимое `build` в ветку `gh-pages`. Нужны права на push в этот репозиторий.

Без своего домена сайт откроется по адресу [https://viterobk.github.io/intuition-training/](https://viterobk.github.io/intuition-training/). Ниже — как повесить на него поддомен, например `intuition.example.com`.

### 1. Зафиксировать домен в сборке

Пакет `gh-pages` при каждой публикации заменяет ветку `gh-pages` содержимым `build`. Если домен указан только в настройках GitHub, следующий `npm run deploy` сотрёт его.

Создайте файл `public/CNAME` из одной строки, без `https://` и без слэша в конце:

```text
intuition.example.com
```

Create React App копирует `public/` в `build`, и файл попадёт в ветку `gh-pages` вместе с сайтом.

### 2. Опубликовать ветку

```bash
npm run deploy
```

### 3. Включить Pages

В репозитории на GitHub: **Settings → Pages**.

- **Source:** Deploy from a branch
- **Branch:** `gh-pages`, каталог `/ (root)`

Дождитесь, пока сборка Pages станет зелёной, и откройте `https://viterobk.github.io/intuition-training/`. Упражнения должны переключаться по ссылкам с `#`.

### 4. DNS-запись поддомена

У регистратора или в DNS-хостинге домена `example.com` добавьте запись:

| Тип | Имя | Значение |
| --- | --- | --- |
| CNAME | `intuition` | `viterobk.github.io` |

Имя — это метка поддомена. Для `intuition.example.com` она равна `intuition`. У части панелей в поле имени нужно вписать полный адрес `intuition.example.com`. Значение — всегда `viterobk.github.io`, без пути репозитория и без `https://`.

Запись A здесь не нужна: поддомен указывает на GitHub, а не на IP вашего сервера. Проверка:

```bash
dig CNAME intuition.example.com +short
```

В ответе должен быть `viterobk.github.io.` Обновление DNS обычно занимает от нескольких минут до нескольких часов.

Если DNS стоит за прокси Cloudflare, на время выпуска сертификата отключите прокси для этой записи (режим DNS only). Иначе GitHub может не выпустить сертификат.

### 5. Привязать домен и включить HTTPS

Снова **Settings → Pages → Custom domain**: `intuition.example.com`. Сохраните и дождитесь проверки DNS. После этого включите **Enforce HTTPS**.

Сайт будет открываться как `https://intuition.example.com/#/`. Адрес `github.io` GitHub перенаправит на этот поддомен.

Повторная публикация — тот же `npm run deploy`. Файл `public/CNAME` должен оставаться в репозитории, иначе домен сбросится.

## Свой сервер

Подойдёт любой хост, где можно раздавать файлы по HTTP: VPS, домашний сервер, виртуальный хостинг со своим каталогом сайта. Поддомен указывает на IP этой машины.

### 1. DNS

| Тип | Имя | Значение |
| --- | --- | --- |
| A | `intuition` | IPv4 сервера |
| AAAA | `intuition` | IPv6 сервера, если он есть |

AAAA добавляйте только при реальном IPv6. CNAME используйте, если поддомен должен указывать на другое имя, а не на IP. Проверка:

```bash
dig A intuition.example.com +short
```

### 2. Собрать и скопировать файлы

На машине, где есть Node.js 14 или новее:

```bash
npm install
npm run build
rsync -av --delete build/ user@server:/var/www/intuition-training/
```

В каталог сайта кладётся содержимое `build`, а не сама папка `build`: по адресу поддомена должен открываться `index.html`. Флаг `--delete` убирает с сервера файлы, которых больше нет в сборке. Каталог `/var/www/intuition-training/` замените на тот, который указан в конфиге веб-сервера.

Дальше серверу Node.js не нужен.

### 3. Nginx

```nginx
server {
    listen 80;
    server_name intuition.example.com;

    root /var/www/intuition-training;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`try_files` отдаёт существующие файлы (`static/`, `cards/`, `service-worker.js`) и `index.html` для остальных путей. Для адресов с `#` это не обязательно, но прямой заход на путь без решётки тогда тоже показывает приложение.

Проверка и применение:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Apache

Каталог сайта — тот же, `index.html` в его корне. Виртуальный хост:

```apache
<VirtualHost *:80>
    ServerName intuition.example.com
    DocumentRoot /var/www/intuition-training

    <Directory /var/www/intuition-training>
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>
</VirtualHost>
```

После правки: `sudo apachectl configtest`, затем перезагрузка Apache.

### 5. HTTPS

Для service worker и установки приложения нужен сертификат. На nginx с Certbot:

```bash
sudo certbot --nginx -d intuition.example.com
```

Certbot сам пропишет `listen 443 ssl` и редирект с HTTP. Для Apache та же утилита вызывается с `--apache`. Сертификат Let's Encrypt продлевается автоматически, если таймер certbot включён.

Обновление сайта: снова `npm run build` и `rsync`. После выкладки service worker подхватывает новую версию и перезагружает открытую вкладку.
