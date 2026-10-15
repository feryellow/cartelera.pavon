// Matriz única de permisos en el navegador: la misma que usa el servidor (/api/me → access).
// YCPerm.can(módulo, acción) con acciones read · create · update · delete · admin.
(function(){
let A={read:[],write:[],admin:false};
const has=(list,m)=>list.includes("*")||list.includes(m);
window.YCPerm={
  set(access){A=access||{read:[],write:[],admin:false}},
  can(module,action="read"){if(action==="admin")return !!A.admin;return action==="read"?has(A.read,module):has(A.write,module)},
  get access(){return A}
};
})();
