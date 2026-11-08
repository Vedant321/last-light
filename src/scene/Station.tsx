import { Canvas, useFrame } from '@react-three/fiber';
import { Component, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { State } from '../game/state';
function Box({p,s,color='#182633',metal=.65}:{p:[number,number,number];s:[number,number,number];color?:string;metal?:number}){return <mesh position={p} receiveShadow castShadow><boxGeometry args={s}/><meshStandardMaterial color={color} metalness={metal} roughness={.52}/></mesh>}
function LightStrip({p,s,color='#75d8e8'}:{p:[number,number,number];s:[number,number,number];color?:string}){return <mesh position={p}><boxGeometry args={s}/><meshBasicMaterial color={color}/></mesh>}
function Earth({reducedMotion}:{reducedMotion:boolean}){const ref=useRef<THREE.Mesh>(null);useFrame((_,dt)=>{if(ref.current&&!reducedMotion)ref.current.rotation.y+=dt*.006});return <group position={[0,3,-33]}><mesh ref={ref} rotation={[0,0,.3]}><sphereGeometry args={[10,64,48]}/><meshStandardMaterial color="#38657b" roughness={1}/></mesh><mesh position={[0,0,0]} scale={1.015}><sphereGeometry args={[10,64,32]}/><meshBasicMaterial color="#7cbfd0" transparent opacity={.13} wireframe/></mesh><pointLight position={[-12,8,5]} intensity={250} color="#cee9ef"/></group>}
function World({state,reducedMotion}:{state:State;reducedMotion:boolean}){const core=state.core;return <>
 <color attach="background" args={['#030811']}/><fog attach="fog" args={['#080f18',18,65]}/><ambientLight intensity={.45}/><directionalLight position={[-8,8,-12]} intensity={2} color="#91b9d0"/>
 <Earth reducedMotion={reducedMotion}/>
 <Box p={[0,-2,0]} s={[26,.4,38]} color="#101b24"/>
 {[-12,12].map(x=><Box key={x} p={[x,3,0]} s={[.5,10,38]}/>)}
 {/* Window mullions and a deep pressure frame */}
 <Box p={[0,8,-14]} s={[24,2,2]}/><Box p={[0,-1.5,-14]} s={[24,1,2]}/>
 {[-11,-5.5,5.5,11].map(x=><Box key={x} p={[x,3,-14]} s={[.3,10,1]}/>)}
 <mesh position={[0,3,-14.1]}><planeGeometry args={[23,10]}/><meshPhysicalMaterial color="#729aaf" transparent opacity={.09} metalness={.7} roughness={.2}/></mesh>
 {[-10,-6,6,10].map(x=><group key={x}><Box p={[x,2.3,-5]} s={[.5,8.5,.8]}/><LightStrip p={[x-.27,2.3,-4.55]} s={[.05,5,.08]} color={x<0?'#bf8b50':'#76a6b1'}/><Box p={[x,6.3,0]} s={[.5,.5,18]}/></group>)}
 {[-10,-6,-2,2,6,10].map(x=><LightStrip key={x} p={[x,-1.77,0]} s={[.035,.02,27]} color="#3d5a65"/>)}
 {[-10,-6,-2,2,6,10].map(z=><Box key={z} p={[0,-1.76,z]} s={[24,.025,.03]} color="#34424a"/>)}
 {/* Three compact compartment thresholds */}
 {[-7.8,0,7.8].map((x,i)=><group key={x} position={[x,0,-9]}><Box p={[0,1.3,0]} s={[4.8,5.9,1.5]} color="#15232d"/><Box p={[0,1.1,.8]} s={[3.8,4.7,.1]} color={i===0&&state.battery==='installed'?'#192e29':i===1&&state.route?'#183b3b':'#0b151d'}/><LightStrip p={[0,3.85,.82]} s={[3.8,.08,.05]} color={i===0?'#e0a15e':i===1?'#7dd8dc':'#a6c3cf'}/><Box p={[0,1,.9]} s={[.045,4,.04]} color="#607780"/>{[-1,1].map(v=><Box key={v} p={[v*1.65,1,1]} s={[.08,1.4,.15]} color="#4b6068"/>)}<pointLight position={[0,3,3]} intensity={18} color={i===0?'#f6aa59':'#80cedd'}/></group>)}
 {/* Communications desk and Echo Core */}
 <group position={[-3,-1.5,1]}><Box p={[0,.9,0]} s={[3,1.8,1.5]}/><Box p={[0,1.9,-.2]} s={[3.3,.16,1.9]}/><mesh position={[0,2.3,-.55]} rotation={[-.15,0,0]}><boxGeometry args={[2,.8,.08]}/><meshBasicMaterial color="#284c53"/></mesh><LightStrip p={[0,2.3,-.49]} s={[1.7,.03,.03]}/></group>
 <group position={[3,-1.5,1]}><Box p={[0,1,0]} s={[1.7,2,1.7]}/><mesh position={[0,2.5,0]}><cylinderGeometry args={[.65,.65,1.1,24]}/><meshStandardMaterial color={core?'#8ad9df':'#2b393e'} emissive={core?'#4babb9':'#000000'} emissiveIntensity={1.5} wireframe/></mesh><Box p={[0,3.15,0]} s={[1.7,.2,1.7]}/><pointLight position={[0,2.8,0]} intensity={core?12:0} color="#6ddce6"/></group>
 <Box p={[-8,-.9,2]} s={[2.4,1.4,1.3]} color="#4a453b"/><LightStrip p={[-8,-.15,2.67]} s={[1.9,.05,.03]} color="#e5af61"/>
 <pointLight position={[-9,2,5]} intensity={35} color="#dc8c45"/><pointLight position={[8,3,3]} intensity={28} color="#71afca"/>
 </>}
class Boundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<div className="webgl-fallback">Station visualization unavailable. All mission controls remain available below.</div>:this.props.children}}
export default function Station({state,reducedMotion}:{state:State;reducedMotion:boolean}){return <Boundary><Canvas camera={{position:[0,3.4,13],fov:57}} dpr={[1,1.5]} onCreated={({camera})=>camera.lookAt(0,1,-9)}><World state={state} reducedMotion={reducedMotion}/></Canvas></Boundary>}
