"""Android-only extension of the original Schulte source; other modes keep their rules."""
def extend(source):
    edits={
      '<option value="complete">完成 25 个 · 记录总用时</option>':'<option value="complete">完成 25 个 · 记录总用时</option><option value="reverse">倒序 35 秒 · 点击 25 → 1</option>',
      "state.mode==='challenge'":"state.mode!=='complete'",
      '30-seconds':"(state.mode==='reverse'?35:30)-seconds",
      'seconds>=30':"seconds>=(state.mode==='reverse'?35:30)",
      'Math.min(30,elapsed())':"Math.min(state.mode==='reverse'?35:30,elapsed())",
      'state.next=1;state.errors=0;state.running=true':"state.next=state.mode==='reverse'?25:1;state.errors=0;state.running=true",
      "state.next>25?'完成'":"(state.mode==='reverse'?state.next<1:state.next>25)?'完成'",
      '(state.next-1)/25':"(state.mode==='reverse'?25-state.next:state.next-1)/25",
      "'训练中：从 1 开始，依次点击到 25。'":"state.mode==='reverse'?'倒序点击：25 → 1；这不是眼动识别。':'训练中：从 1 开始，依次点击到 25。'",
      'state.next++;cell.classList':"state.next+=state.mode==='reverse'?-1:1;cell.classList",
      'state.next===26':"(state.mode==='reverse'?state.next===0:state.next===26)",
      'const found=state.next-1':"const found=state.mode==='reverse'?25-state.next:state.next-1",
      "'30 秒到，本轮结束'":"(state.mode==='reverse'?'35 秒到，本轮结束':'30 秒到，本轮结束')",
      "'30 秒':'完成计时'":"(record.mode==='reverse'?'倒序35秒':'30 秒'):'完成计时'",
      "?'30.0':'0.0'":"?(state.mode==='reverse'?'35.0':'30.0'):'0.0'",
      '<li>从 <strong>1</strong>':'<li>倒序 35 秒模式为点击作答：25 → 1；不自动识别眼动，独立计分。</li><li>原正序模式：从 <strong>1</strong>'
    }
    for old,new in edits.items():
        if old not in source: raise ValueError('Schulte extension anchor missing: '+old)
        source=source.replace(old,new)
    return source
