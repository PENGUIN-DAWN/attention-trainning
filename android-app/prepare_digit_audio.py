"""Normalize/pad local SAPI recordings. No network, third-party modules or runtime TTS."""
from pathlib import Path
import base64, hashlib, io, json, math, struct, wave

HERE=Path(__file__).resolve().parent/'audio'
clips={}
for n in range(1,10):
    with wave.open(str(HERE/f'raw-{n}.wav'),'rb') as w:
        assert w.getnchannels()==1 and w.getsampwidth()==2
        rate=w.getframerate()
        samples=list(struct.unpack('<'+'h'*w.getnframes(),w.readframes(w.getnframes())))
    threshold=max(70,max(abs(x) for x in samples)*.015)
    nonzero=[i for i,x in enumerate(samples) if abs(x)>threshold]
    assert nonzero, n
    lo=max(0,nonzero[0]-int(rate*.025)); hi=min(len(samples),nonzero[-1]+int(rate*.045))
    samples=samples[lo:hi]
    rms=math.sqrt(sum(x*x for x in samples)/len(samples))
    gain=min(3000/rms,27000/max(abs(x) for x in samples))
    samples=[round(x*gain) for x in samples]
    clips[n]=(rate,samples,rms*gain)
assert len({r for r,s,a in clips.values()})==1
rate=clips[1][0]
length=max(len(s) for r,s,a in clips.values())+int(rate*.1)
data={'version':'zh-huihui-1','voice':'Microsoft Huihui Desktop (offline SAPI)','sampleRate':rate,'durationMs':length/rate*1000,'clips':{},'validation':{}}
for n,(rate,samples,rms) in clips.items():
    padded=[0]*int(rate*.05)+samples
    padded += [0]*(length-len(padded))
    output=io.BytesIO()
    with wave.open(output,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(struct.pack('<'+'h'*len(padded),*padded))
    raw=output.getvalue()
    data['clips'][n]=base64.b64encode(raw).decode('ascii')
    data['validation'][n]={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'activeRms':round(rms,2)}
(HERE/'digits.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({k:v for k,v in data.items() if k!='clips'},ensure_ascii=False,indent=2))
