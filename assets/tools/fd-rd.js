/* Infinity by GroupChatOn — fd-rd. Designed & Developed by Nivesh Sahayak. See LICENSE. */
GCOTools.engine('calc', 'fd-rd', {
  inputs: [{ k: 't', label: 'Deposit type', options: [['fd', 'Fixed deposit (one-time)'], ['rd', 'Recurring deposit (monthly)']], value: 'fd' },
    { k: 'a', label: 'Amount (one-time or every month)', money: true, value: 100000 }, { k: 'r', label: 'Interest rate', suffix: '% a year', value: 7, step: 0.05 },
    { k: 'm', label: 'Period', suffix: 'months', value: 60 }, { k: 'q', label: 'Interest compounded', options: [['4', 'Quarterly (most banks)'], ['12', 'Monthly'], ['2', 'Half-yearly'], ['1', 'Yearly']], value: '4' }],
  calc: function (v, X) {
    var q = +v.q, r = v.r / 100, mat, put;
    if (v.t === 'fd') { mat = v.a * Math.pow(1 + r / q, q * v.m / 12); put = v.a; }
    else { mat = 0; for (var i = 1; i <= v.m; i++) mat += v.a * Math.pow(1 + r / q, q * (v.m - i + 1) / 12); put = v.a * v.m; }
    return { rows: [['Maturity amount', mat, 'money'], ['Interest earned', mat - put, 'money'], ['Total deposited', put, 'money'], ['Effective yearly yield', (Math.pow(1 + r / q, q) - 1) * 100, 'pct']], bars: [['Deposited', put], ['Interest', mat - put]],
      note: 'Interest on deposits is taxable in most countries, and banks may deduct tax (TDS in India) when it crosses a limit.' };
  },
  test: [{ in: { t: 'fd', a: 100000, r: 7, m: 60, q: '4' }, expect: { 'Maturity amount': 141477.82 } }, { in: { t: 'rd', a: 5000, r: 7, m: 12, q: '4' }, expect: { 'Maturity amount': 62310.66 } }]
});
