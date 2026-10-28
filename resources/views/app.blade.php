<!doctype html>
<html lang="uk">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <title>ПЕППІ Дитячий Простір — бухгалтерія</title>
    <meta name="description" content="Бухгалтерський облік дитячого садка: діти, групи, нарахування, оплати, зарплати, витрати та звіти." />
    <link rel="icon" type="image/png" href="/images/peppi/frame-1.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    @viteReactRefresh
    @vite('resources/js/main.tsx')
</head>
<body class="bg-[#FFFDF9] text-stone-800 antialiased selection:bg-orange-200 selection:text-orange-900">
    <div id="root"></div>
</body>
</html>
