"""Inspect the bundled samples and create an optional user-initiated stereo diagnostic."""
from pathlib import Path
import base64, hashlib, io, json, struct, wave

HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'安卓手机版'
data=json.loads((HERE/'audio/digits.json').read_text(encoding='utf-8'))
clips={}
for n in range(1,10):
    raw=base64.b64decode(data['clips'][str(n)],validate=True)
    assert hashlib.sha256(raw).hexdigest()==data['validation'][str(n)]['sha256']
    with wave.open(io.BytesIO(raw),'rb') as w:
        assert w.getnchannels()==1 and w.getsampwidth()==2 and w.getframerate()==22050
        samples=struct.unpack('<'+'h'*w.getnframes(),w.readframes(w.getnframes()))
    assert any(samples) and max(abs(v) for v in samples)<=27000
    clips[n]=samples
assert len({len(a) for a in clips.values()})==1
silence=[0]*len(clips[1]);gap=[(0,0)]*int(22050*.3)
frames=list(zip(clips[1],silence))+gap+list(zip(silence,clips[1]))+gap+list(zip(clips[3],clips[8]))
with wave.open(str(OUT/'双声道试听-1.40.wav'),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(22050);w.writeframes(struct.pack('<'+'h'*(len(frames)*2),*(x for frame in frames for x in frame)))
report={k:v for k,v in data.items() if k!='clips'}
report.update({'all_nine_clips_valid_pcm':True,'same_sample_count':True,'channels_in_demo':2,'demo_sequence':['left only: 1','right only: 1','simultaneous left: 3 / right: 8'],'physical_headphone_channels_tested':False,'human_listening_intelligibility_tested':False})
(OUT/'音频素材校验-1.40.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('9 mono PCM clips verified; optional 2-channel diagnostic saved. Physical listening still required.')
