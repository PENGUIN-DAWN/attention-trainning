"""Generate Android-only UI around unchanged, embedded training engines."""
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET
from descending import extend as descending_source

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

def prepare():
    template = (ROOT / '_hub/hub.template.html').read_text(encoding='utf-8')
    web = (ROOT / 'index.html').read_text(encoding='utf-8')
    payload = re.search(r'<script type="application/json" id="trainingData">(.*?)</script>', web, re.S).group(1)
    visuals = template[template.index('const visuals='):template.index('function updateToday')]
    page = template[:template.index('<script type="application/json"')]
    page = page.replace('<meta name="viewport" content="width=device-width,initial-scale=1">', '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">')
    page = page.replace('<nav class="header-actions"', '<button class="icon-button" id="preferencesButton" type="button" aria-label="界面设置">☷</button><nav class="header-actions"')
    page = page.replace('<span>慢一点，也可以。</span>', '<button id="helpButton" class="app-help-button" type="button">离线版 · 使用说明</button>')
    page = page.replace('六种', '十六种').replace('六个轻盈', '十六个轻盈').replace('六项', '十六项').replace('六颗', '十六颗').replace('0 / 6 项', '0 / 16 项').replace('今日探索', '今日练习').replace('SIX PRACTICES', 'SIXTEEN PRACTICES')
    visuals = visuals.replace('i<6;', 'i<16;').replace(">0'+module.id", ">'+String(module.id).padStart(2,'0')")
    pos = visuals.index('function todayKey')
    extras = '''visuals.push(...['#e5eafb','#e0f0ec','#fff0de','#eee7fa'].map((color,i)=>({color,shade:color,shadow:'#b8afcc',size:'190px',duration:(7+i*.3)+'s',delay:'-2s'})));
icons.push('<circle cx="18" cy="22" r="7" fill="currentColor"/><circle cx="45" cy="40" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 24l15 11" stroke="currentColor" stroke-width="2"/>','<rect x="8" y="8" width="48" height="48" rx="10" fill="none" stroke="currentColor"/><text x="32" y="39" text-anchor="middle" fill="currentColor" font-size="22">68</text>','<path d="M14 22h36v32H14ZM10 14h44v9H10M32 15v38" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="44" cy="40" r="14" fill="#fff0de"/><path d="M37 40h14" stroke="currentColor" stroke-width="2"/>','<text x="32" y="44" text-anchor="middle" fill="currentColor" font-size="38">末</text>');
'''
    extras += '''visuals.push(...['#e3edf8','#e6f0e8','#f7e9d9','#eee6f5','#e1eef1','#f3e5ee'].map((color,i)=>({color,shade:color,shadow:'#b7afc9',size:'190px',duration:(7+i*.2)+'s',delay:'-1s'})));
icons.push(...['↔','息','⊙','△','♫','A2'].map(t=>'<text x="32" y="44" fill="currentColor" text-anchor="middle" font-size="36">'+t+'</text>'));
'''
    visuals = visuals[:pos] + extras + visuals[pos:]
    # Android-only directory; no pointermove layout reads and no legacy bubble motion.
    visuals = visuals[:visuals.index('function buildDirectory')] + (HERE/'directory.js').read_text(encoding='utf-8')
    page = page.replace('让注意力，<br>慢慢<em>聚拢。</em>', '专注此刻，<br><em>从一次练习开始。</em>')
    page = page.replace('十六种练习，十六个轻盈的入口。<br>挑一颗气泡，从此刻开始。', '十六项离线训练。<br>按自己的节奏，选择今天的练习。')
    page = page.replace('不必按顺序，自由探索', '固定条件 · 本机记录 · 完全离线')
    page = page.replace('<meta name="viewport"', '<meta name="theme-color" content="#0d121b"><meta name="viewport"',1)
    start = page.index('<div class="bubble-field"')
    end = page.index('<footer class="home-footer"', start)
    today = page[page.index('<div class="today-strip"',start):end]
    page = page[:start]+today+'''<a class="recent-card" id="recentCard" hidden href="#home"><span><small>最近使用 · 再练一轮</small><strong id="recentTitle"></strong></span><span>开始 →</span></a><div class="directory-heading"><h2>全部训练</h2><span>16 项专项练习</span></div><div class="bubble-field" id="bubbleField"></div>'''+page[end:]
    a = page.index('<section class="play"')
    b = page.index('</section>', a) + len('</section>')
    play = '''<section class="play" id="playView" hidden aria-label="训练页面">
<div class="play-heading"><a class="back-button" href="#home" aria-label="返回训练目录">←</a><div class="play-number" id="playNumber">01</div><div class="play-name"><h1 id="playTitle"></h1><p id="playDescription"></p></div><button class="icon-button" id="rulesButton" type="button" aria-label="查看训练规则">?</button></div>
<nav class="module-tabs" id="moduleTabs" aria-label="选择训练项目"></nav>
<div class="frame-host" id="frameHost"><div class="frame-loading" id="frameLoading"><span class="loader"></span>正在准备练习…</div></div>
<a id="nextModule" hidden href="#home">下一项</a>
</section>'''
    page = page[:a] + play + page[b:]
    chrome = '\n'.join((HERE/name).read_text(encoding='utf-8') for name in ['design-tokens.css','dark-training.css','dialog-motion.css'])
    css = '\n'.join((HERE/name).read_text(encoding='utf-8') for name in ['design-tokens.css','experience.css','tools-directory.css','dark-shell.css','dialog-motion.css'])
    js = '\n'.join((HERE / name).read_text(encoding='utf-8') for name in ['storage.js', 'arcade-rules.js', 'arcade-store.js', 'tool-rules.js', 'advanced-rules.js', 'shell-motion.js','experience.js'])
    version = ET.parse(HERE / 'AndroidManifest.xml').getroot().get('{http://schemas.android.com/apk/res/android}versionName')
    js = js.replace('__APP_VERSION__', version)
    page = page.replace('</head>', '<style>' + css + '</style></head>', 1)
    training = {'css': (HERE / 'training.css').read_text(encoding='utf-8'), 'js': (HERE / 'training.js').read_text(encoding='utf-8'), 'chrome':chrome,'chromeStatus':(HERE/'chrome-status.js').read_text(encoding='utf-8')}
    modules = json.loads(payload)
    modules[0]['source'] = descending_source(modules[0]['source'])
    tool_source = (HERE / 'tool-page.html').read_text(encoding='utf-8').replace('</head>', '<style>'+(HERE/'tool.css').read_text(encoding='utf-8')+'</style></head>').replace('</body>', '<script>'+(HERE/'tool-rules.js').read_text(encoding='utf-8')+'\n'+(HERE/'tool-ui.js').read_text(encoding='utf-8')+'</script></body>')
    for i,(title,short,accent) in enumerate([('多目标追踪','记住目标，追踪位置','#46689b'),('重复数字搜寻','找出成对的数字','#327462'),('消失的物品','记住整组，找出缺失','#885c24'),('相似字符找异类','看清笔画，找到目标','#785696')],7):
        modules.append({'id':i,'title':title,'short':short,'accent':accent,'source':tool_source})
    advanced_source = (HERE/'advanced-page.html').read_text(encoding='utf-8').replace('</head>','<style>'+(HERE/'advanced.css').read_text(encoding='utf-8')+'</style></head>').replace('</body>','<script>'+'\n'.join((HERE/name).read_text(encoding='utf-8') for name in ['advanced-rules.js','advanced-clock.js','advanced-audio.js','advanced-ui.js'])+'</script></body>')
    for i,(title,short,accent) in enumerate([('规则切换','跟随提示，转换规则','#456697'),('呼吸聚焦','察觉走神，温和返回','#406b54'),('中央与周边辨认','兼顾中心，辨认周边','#856032'),('持续监测','圆形点击，三角不点','#71538a'),('双耳分听','选择声道，听清目标','#326d7b'),('串行双目标识别','连续信息，记住双目标','#8e4b73')],11):
        modules.append({'id':i,'title':title,'short':short,'accent':accent,'source':advanced_source})
    for id_, data in [('trainingData', modules), ('trainingPresentation', training), ('digitAudio',json.loads((HERE/'audio/digits.json').read_text(encoding='utf-8')))]:
        page += '<script type="application/json" id="' + id_ + '">' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + '</script>'
    page += '<script>\n' + visuals + '\n' + js + '\n</script></body></html>'
    (HERE / 'assets').mkdir(exist_ok=True)
    (HERE / 'assets' / 'index.html').write_text(page, encoding='utf-8')
    return HERE / 'assets' / 'index.html'

if __name__ == '__main__': print(prepare())
