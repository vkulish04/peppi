<!doctype html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>{{ $receiptNumber }}</title>
    <style>
        @page { margin: 26px 32px; }
        body { font-family: "DejaVu Sans", sans-serif; color: #292524; font-size: 11px; }
        .row { width: 100%; }
        .muted { color: #78716c; }
        .right { text-align: right; }
        .center { text-align: center; }
        .title { font-size: 18px; font-weight: 700; margin: 2px 0 4px; }
        .subtitle { font-size: 13px; font-weight: 700; }
        .box { border: 1px solid #fed7aa; background: #fff7ed; padding: 10px; margin-top: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { padding: 7px 6px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
        th { background: #f5f5f4; text-align: left; font-size: 10px; text-transform: uppercase; }
        .money { text-align: right; white-space: nowrap; }
        .total td { border-top: 2px solid #292524; border-bottom: none; font-weight: 700; font-size: 13px; }
        .green { color: #047857; }
        .orange { color: #c2410c; }
        .payments { margin-top: 16px; }
        .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #d6d3d1; }
        .small { font-size: 9px; }
    </style>
</head>
<body>
    <table style="margin-top:0; border-collapse:collapse;">
        <tr>
            <td style="border:none; padding:0;">
                <img src="{{ $kindergarten['logo_data_uri'] }}" alt="Логотип" style="width:52px; height:52px; object-fit:contain; float:left; margin-right:10px;">
                <div class="title">{{ $kindergarten['name'] }}</div>
                <div class="muted">{{ $kindergarten['address'] }} @if($kindergarten['contact_phone']) • {{ $kindergarten['contact_phone'] }} @endif @if($kindergarten['contact_email']) • {{ $kindergarten['contact_email'] }} @endif</div>
            </td>
            <td class="right" style="border:none; padding:0;">
                <strong>{{ $receiptNumber }}</strong><br>
                <span class="muted">Сформовано: {{ now()->format('d.m.Y') }}</span>
            </td>
        </tr>
    </table>

    <div class="box center">
        <div class="subtitle">РАХУНОК-КВИТАНЦІЯ ЗА ПОСЛУГИ ДИТСАДКА</div>
        <div>Період: <strong>{{ str_pad($bill->month, 2, '0', STR_PAD_LEFT) }}.{{ $bill->year }}</strong></div>
    </div>

    <table>
        <tr>
            <td><span class="muted">Дитина:</span><br><strong>{{ $bill->child->full_name }}</strong><br>{{ $bill->child->group?->name }}</td>
            <td class="right"><span class="muted">Платник:</span><br><strong>{{ $bill->child->parent_name ?: 'Батьки вихованця' }}</strong><br>{{ $bill->child->parent_phone }}</td>
        </tr>
    </table>

    <table>
        <thead>
            <tr><th style="width:5%">№</th><th>Послуга</th><th style="width:14%">К-сть</th><th style="width:18%" class="money">Ціна</th><th style="width:18%" class="money">Сума</th></tr>
        </thead>
        <tbody>
            @forelse($bill->items as $item)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ $item->name }}</td>
                    <td>{{ number_format((float)$item->quantity, 2, ',', ' ') }}</td>
                    <td class="money">{{ number_format((float)$item->unit_price, 2, ',', ' ') }} грн</td>
                    <td class="money">{{ number_format((float)$item->amount, 2, ',', ' ') }} грн</td>
                </tr>
            @empty
                <tr><td colspan="5" class="center muted">Немає позицій нарахування</td></tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr><td colspan="4" class="right">Підсумок:</td><td class="money">{{ number_format((float)$bill->subtotal, 2, ',', ' ') }} грн</td></tr>
            @if((float)$bill->discount_amount > 0)
                <tr class="green"><td colspan="4" class="right">Знижка ({{ number_format((float)$bill->discount_percent, 2, ',', ' ') }}%):</td><td class="money">-{{ number_format((float)$bill->discount_amount, 2, ',', ' ') }} грн</td></tr>
            @endif
            @if((float)$bill->deductions_total > 0)
                <tr class="green"><td colspan="4" class="right">Перерахунки / списання:</td><td class="money">-{{ number_format((float)$bill->deductions_total, 2, ',', ' ') }} грн</td></tr>
            @endif
            <tr class="total"><td colspan="4" class="right">РАЗОМ ДО СПЛАТИ:</td><td class="money orange">{{ number_format((float)$bill->total, 2, ',', ' ') }} грн</td></tr>
            <tr><td colspan="4" class="right">Сплачено:</td><td class="money green">{{ number_format((float)$bill->paid_amount, 2, ',', ' ') }} грн</td></tr>
            <tr><td colspan="4" class="right"><strong>Борг:</strong></td><td class="money"><strong>{{ number_format((float)$bill->debt, 2, ',', ' ') }} грн</strong></td></tr>
        </tfoot>
    </table>

    @if($bill->payments->count())
        <div class="payments">
            <strong>Історія платежів</strong>
            <table>
                <thead><tr><th>Дата</th><th>Спосіб</th><th>Референс</th><th class="money">Сума</th></tr></thead>
                <tbody>
                @foreach($bill->payments as $payment)
                    <tr>
                        <td>{{ $payment->payment_date->format('d.m.Y') }}</td>
                        <td>{{ $paymentMethods[$payment->payment_method] ?? $payment->payment_method }}</td>
                        <td>{{ $payment->reference ?: '—' }}</td>
                        <td class="money">{{ number_format((float)$payment->amount, 2, ',', ' ') }} грн</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        </div>
    @endif

    @if($kindergarten['iban'] || $kindergarten['edrpou'] || $kindergarten['payment_purpose'])
        <div class="box small">
            <strong>Реквізити:</strong><br>
            @if($kindergarten['edrpou']) ЄДРПОУ: {{ $kindergarten['edrpou'] }}<br>@endif
            @if($kindergarten['iban']) IBAN: {{ $kindergarten['iban'] }} @if($kindergarten['bank_name']) ({{ $kindergarten['bank_name'] }}) @endif<br>@endif
            Призначення: {{ $kindergarten['payment_purpose'] }}
        </div>
    @endif

    @if($kindergarten['receipt_note'])
        <div class="box small">{{ $kindergarten['receipt_note'] }}</div>
    @endif

    <div class="footer muted small">
        Квитанція сформована автоматично з даних бухгалтерської системи. Актуальний стан: нараховано {{ number_format((float)$bill->total, 2, ',', ' ') }} грн, сплачено {{ number_format((float)$bill->paid_amount, 2, ',', ' ') }} грн, борг {{ number_format((float)$bill->debt, 2, ',', ' ') }} грн.
    </div>
</body>
</html>
