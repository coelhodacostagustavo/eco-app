//1.0 Variáveis Globais
let usuarios = [];
let itens = [];
let favoritos = [];
let notificacoesRecebidas = [];
let notificacoesCategorias = [];
let notificacoesLocais = [];
let negociacoes = [];
let mensagens = [];
let _ultimoId = 0;
let usuarioLogado = null;
let itemAtualLance = null;
let mostrarFavoritos = false;
let cookiesAceitos = localStorage.getItem("eco_cookies_aceitos") === "true";
let itemDetalhesAtual = null;

//Função auxiliar para pegar elemento
const $ = (id) => document.getElementById(id);

//Sistema de toasts
function mostrarToast(mensagem, tipo = "info") {
  const container = $("toast-container") || criarContainerToast();
  const cores = {
    success: "bg-success",
    error: "bg-danger",
    warning: "bg-warning",
    info: "bg-info",
  };
  const icones = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  const toastId = "toast-" + Date.now();

  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-white ${
    cores[tipo] || cores.info
  } border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body"><strong>${
          icones[tipo] || icones.info
        }</strong> ${mensagem}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", toastHTML);
  const toastElement = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: tipo === "error" ? 3000 : 2000,
  });
  bsToast.show();
  toastElement.addEventListener("hidden.bs.toast", () => toastElement.remove());
}

function criarContainerToast() {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.className = "toast-container position-fixed top-0 end-0 p-3";
  container.style.zIndex = "9999";
  document.body.appendChild(container);
  return container;
}

// 2.0 Funções de armazenamento LOCAL STORAGE
// Função para comprimir imagens dos anúncios e fotos de perfil para economizar espaço
function comprimirImagem(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        //Redimensionar mantendo proporção da imagem
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        //Converter para Base64 comprimido (JPEG 70% qualidade)
        const comprimida = canvas.toDataURL("image/jpeg", quality);

        const tamanhoOriginal = (file.size / 1024).toFixed(0);
        const tamanhoNovo = (comprimida.length / 1024).toFixed(0);
        console.log(
          `📦 Comprimiu: ${tamanhoOriginal}KB → ${tamanhoNovo}KB (economia de ${
            100 - ((tamanhoNovo / tamanhoOriginal) * 100).toFixed(0)
          }%)`
        );

        resolve(comprimida);
      };

      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function salvar(chave, valor) {
  try {
    const jsonString = JSON.stringify(valor);
    //Verificar tamanho antes de salvar
    const tamanhoMB = new Blob([jsonString]).size / 1024 / 1024;

    if (tamanhoMB > 3.5) {
      const percentual = ((tamanhoMB / 5) * 100).toFixed(0);
      console.warn(
        `⚠️ Armazenamento em ${percentual}%: ${tamanhoMB.toFixed(2)}MB`
      );
      mostrarToast(`Armazenamento: ${percentual}% da capacidade`, "warning");
    }

    localStorage.setItem(chave, jsonString);
    console.log(
      `✅ Salvou ${chave}:`,
      valor.length || "objeto",
      `(${tamanhoMB.toFixed(2)}MB)`
    );
    return true;
  } catch (erro) {
    console.error("❌ Erro ao salvar:", erro);

    if (erro.name === "QuotaExceededError") {
      mostrarToast(
        "Armazenamento cheio! Remova itens antigos ou use menos imagens.",
        "error"
      );
      limparDadosAntigos();
    } else {
      mostrarToast("Erro ao salvar dados!", "error");
    }
    return false;
  }
}
//Limpar dados antigos automaticamente
function limparDadosAntigos() {
  const agora = Date.now();
  const seteDias = 7 * 24 * 3600000;

  const itensRemovidos = itens.filter((item) => {
    if ((item.negociado || item.cancelado) && item.dataFinalizacao) {
      const dataFim = new Date(item.dataFinalizacao).getTime();
      return agora - dataFim >= seteDias;
    }
    return false;
  });

  if (itensRemovidos.length > 0) {
    itens = itens.filter(
      (item) => !itensRemovidos.some((ir) => ir.id === item.id)
    );
    console.log(`🗑️ Removidos ${itensRemovidos.length} itens antigos`);
    salvarDadosCompletos();
    mostrarToast(
      `${itensRemovidos.length} itens antigos removidos para liberar espaço.`,
      "info"
    );
  }
}

function carregar(chave) {
  try {
    const dados = localStorage.getItem(chave);
    const resultado = dados ? JSON.parse(dados) : [];
    console.log(`Carregou ${chave}:`, resultado.length || "objeto");
    return resultado;
  } catch (erro) {
    console.error("Erro ao carregar:", erro);
    return [];
  }
}

function salvarDadosCompletos() {
  console.log("Salvando todos os dados...");

  let sucesso = true;
  sucesso = salvar("eco_usuarios", usuarios) && sucesso;
  sucesso = salvar("eco_itens", itens) && sucesso;
  sucesso = salvar("eco_negociacoes", negociacoes) && sucesso;
  sucesso = salvar("eco_mensagens", mensagens) && sucesso;

  if (sucesso) {
    localStorage.setItem("eco_ultimoId", _ultimoId.toString());
    console.log("✅ Salvamento completo! Total de itens:", itens.length);
  } else {
    console.error("❌ Falha ao salvar alguns dados");
  }

  return sucesso;
}

function carregarDadosCompletos() {
  console.log("Carregando todos os dados...");
  usuarios = carregar("eco_usuarios");
  itens = carregar("eco_itens");
  mensagens = carregar("eco_mensagens");
  negociacoes = carregar("eco_negociacoes");

  const idSalvo = localStorage.getItem("eco_ultimoId");
  _ultimoId = idSalvo ? parseInt(idSalvo) : 0;

  console.log(
    "Dados carregados! Usuários:",
    usuarios.length,
    "| Itens:",
    itens.length
  );
  garantirIdsUnicos();
}

function garantirIdsUnicos() {
  if (itens.length > 0) {
    const maiorId = Math.max(...itens.map((item) => item.id || 0));
    if (maiorId > _ultimoId) _ultimoId = maiorId;
  }
  console.log("🔢 Último ID garantido:", _ultimoId);
}

function obterUsuarioPorUsername(username) {
  return usuarios.find((u) => u.username === username) || null;
}
//Calcular distância real entre cidades usando fórmula de Haversine
function calcularDistancia(cidadeA, cidadeB) {
  if (cidadeA === cidadeB) return "0 km";
  // Coordenadas GPS reais das cidades (latitude, longitude). Fonte: Google Maps
  const coordenadas = {
    "Rio de Janeiro": { lat: -22.9068, lng: -43.1729 },
    Niterói: { lat: -22.8839, lng: -43.1039 },
    "São Gonçalo": { lat: -22.8268, lng: -43.0539 },
    "Duque de Caxias": { lat: -22.7858, lng: -43.3055 },
    "Nova Iguaçu": { lat: -22.7591, lng: -43.4509 },
    Maricá: { lat: -22.9194, lng: -42.8186 },
    Itaboraí: { lat: -22.7449, lng: -42.8597 },
  };

  const coordA = coordenadas[cidadeA];
  const coordB = coordenadas[cidadeB];

  if (!coordA || !coordB) return "N/A";

  //Calcula distância entre dois pontos na Terra
  const R = 6371;

  //Converte diferenças de latitude e longitude para radianos
  const dLat = ((coordB.lat - coordA.lat) * Math.PI) / 180;
  const dLng = ((coordB.lng - coordA.lng) * Math.PI) / 180;

  //Aplicação da fórmula de Haversine
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coordA.lat * Math.PI) / 180) *
      Math.cos((coordB.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c; // Distância em km

  //Retorna distância arredondada para 1 casa decimal
  return `${distancia.toFixed(1)} km`;
}

function obterReputacao(username) {
  const usuario = obterUsuarioPorUsername(username);
  if (!usuario || !usuario.avaliacoesRecebidas?.length) return "N/A";

  const soma = usuario.avaliacoesRecebidas.reduce(
    (acc, aval) => acc + aval.estrelas,
    0
  );
  return (soma / usuario.avaliacoesRecebidas.length).toFixed(1);
}

function isTempoCritico(item) {
  const criado = new Date(item.criadoEm).getTime();
  const expira = item.tempoExpiracao * 3600000;
  const restante = criado + expira - Date.now();
  const limite = Math.min(expira * 0.1, 3600000);
  return restante > 0 && restante <= limite;
}

//2.1 Funções dos modais
function abrirModal(modalEl) {
  if (!modalEl) return;
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function fecharModal(modalEl) {
  if (!modalEl) return;
  const modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) modalInstance.hide();
}

function tornarModalArrastavel(modalEl) {
  if (!modalEl) return;
  const dialog = modalEl.querySelector(".modal-dialog");
  const header = modalEl.querySelector(".modal-header");
  if (!dialog || !header) return;

  let isDragging = false,
    offsetX = 0,
    offsetY = 0;
  header.style.cursor = "move";

  header.addEventListener("mousedown", (e) => {
    if (e.target.closest(".btn-close")) return;
    isDragging = true;
    offsetX = e.clientX - dialog.offsetLeft;
    offsetY = e.clientY - dialog.offsetTop;
    header.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    dialog.style.left = `${e.clientX - offsetX}px`;
    dialog.style.top = `${e.clientY - offsetY}px`;
    dialog.style.transform = "none";
    dialog.style.margin = "0";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      header.style.cursor = "move";
    }
  });
}

//2.2 Deletar automaticamente itens expirados
function verificarItensParaDeletar() {
  const agora = Date.now();
  const umDia = 24 * 3600000;

  const itensParaDeletar = itens
    .filter((item) => {
      if (
        (item.negociado || item.expirado || item.cancelado) &&
        item.dataFinalizacao
      ) {
        const dataFim = new Date(item.dataFinalizacao).getTime();
        if (isNaN(dataFim)) return false;
        return agora - dataFim >= umDia;
      }
      return false;
    })
    .map((item) => item.id);

  if (itensParaDeletar.length > 0) {
    itens = itens.filter((item) => !itensParaDeletar.includes(item.id));
    salvarDadosCompletos();

    const homeScreen = $("home-screen");
    if (homeScreen?.style.display === "block") renderizarItens();
  }
}

function marcarItemComoFinalizado(item) {
  if (!item.dataFinalizacao) {
    item.dataFinalizacao = new Date().toISOString();
    salvarDadosCompletos();
  }
}

//2.3 Sistema de EcoPontos
function calcularBonusEcologico(tipoTransporte) {
  const bonus = {
    bicicleta: { pontos: 50, descricao: "🚴 Bônus Bicicleta: +50 EcoPontos!" },
    caminhada: { pontos: 40, descricao: "🚶 Bônus Caminhada: +40 EcoPontos!" },
    transporte_publico: {
      pontos: 30,
      descricao: "🚌 Bônus Transporte Público: +30 EcoPontos!",
    },
    carona_solidaria: {
      pontos: 25,
      descricao: "🚗 Bônus Carona Solidária: +25 EcoPontos!",
    },
  };
  return bonus[tipoTransporte] || { pontos: 0, descricao: "" };
}

function adicionarPontosEco(username, pontos) {
  const user = obterUsuarioPorUsername(username);
  if (user) {
    user.pontosEco = (user.pontosEco || 0) + pontos;
    salvarDadosCompletos();
  }
}

//2.4 Cupons de desconto
function resgatarCupom(pontosCusto, dadosCupom) {
  if (!usuarioLogado) return;

  const pontosAtuais = usuarioLogado.pontosEco || 0;
  if (pontosAtuais < pontosCusto) {
    mostrarToast(
      `Você precisa de ${pontosCusto} pontos. Você tem ${pontosAtuais} pontos.`,
      "warning"
    );
    return;
  }

  usuarioLogado.pontosEco -= pontosCusto;
  if (!usuarioLogado.cupons) usuarioLogado.cupons = [];

  usuarioLogado.cupons.push({
    ...dadosCupom,
    resgatadoEm: new Date().toISOString(),
    usado: false,
  });
  salvarDadosCompletos();
  mostrarToast(
    `🎉 Cupom resgatado! Você tem ${usuarioLogado.pontosEco} pontos restantes.`,
    "success"
  );
  mostrarCupons();
}

function mostrarCupons() {
  const modal = $("modal-cupons");
  const displayPontos = $("display-pontos-usuario");
  const listaCupons = $("lista-cupons-usuario");

  if (displayPontos && usuarioLogado) {
    displayPontos.textContent = `${usuarioLogado.pontosEco || 0} 🌿`;
  }

  if (listaCupons && usuarioLogado) {
    const cupons = usuarioLogado.cupons || [];
    listaCupons.innerHTML =
      cupons.length === 0
        ? '<li class="list-group-item text-muted">Nenhum cupom resgatado ainda.</li>'
        : cupons
            .map((cupom) => {
              const descricao = cupom.desconto
                ? `${cupom.desconto}% de desconto`
                : `R$ ${cupom.valor},00`;
              const statusBadge = cupom.usado
                ? '<span class="badge bg-secondary">Usado</span>'
                : '<span class="badge bg-success">Ativo</span>';
              return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>${descricao}</strong><br>
                <small class="text-muted">Resgatado em: ${new Date(
                  cupom.resgatadoEm
                ).toLocaleDateString()}</small>
              </div>
              ${statusBadge}
            </li>
          `;
            })
            .join("");
  }

  if (modal) abrirModal(modal);
}

//2.5 Perguntas no anúncio
function carregarPerguntasItem(itemId) {
  const item = itens.find((i) => i.id === itemId);
  if (!item) return;

  if (!item.perguntas) item.perguntas = [];
  const listaPerguntas = $("lista-perguntas");
  if (!listaPerguntas) return;

  if (item.perguntas.length === 0) {
    listaPerguntas.innerHTML =
      '<p class="text-muted text-center">Nenhuma pergunta ainda. Seja o primeiro a perguntar!</p>';
  } else {
    listaPerguntas.innerHTML = item.perguntas
      .map((p, idx) => {
        let html = `<div class="pergunta-item">`;
        html += `<div class="texto-pergunta">❓ ${p.pergunta}</div>`;
        html += `<small class="text-muted">Por: ${p.usuarioNome} em ${new Date(
          p.data
        ).toLocaleString()}</small>`;

        if (p.resposta) {
          html += `<div class="texto-resposta">💬 ${p.resposta}</div>`;
        } else if (
          usuarioLogado &&
          item.anuncianteUsername === usuarioLogado.username
        ) {
          html += `<button class="btn btn-sm btn-success mt-2 btn-responder-pergunta" data-idx="${idx}">Responder</button>`;
        } else {
          html +=
            '<small class="text-muted d-block mt-2">Aguardando resposta...</small>';
        }

        html += `</div>`;
        return html;
      })
      .join("");

    document.querySelectorAll(".btn-responder-pergunta").forEach((btn) => {
      btn.onclick = function () {
        const idx = parseInt(this.dataset.idx);
        const resposta = prompt("Digite sua resposta:");
        if (resposta?.trim()) {
          item.perguntas[idx].resposta = resposta.trim();
          salvarDadosCompletos();
          carregarPerguntasItem(itemId);
        }
      };
    });
  }
}

function enviarPergunta(itemId) {
  if (!usuarioLogado) {
    mostrarToast("Faça login para fazer perguntas.", "warning");
    return;
  }

  const inputPergunta = $("input-pergunta");
  const pergunta = inputPergunta.value.trim();

  if (!pergunta) {
    mostrarToast("Digite uma pergunta primeiro.", "warning");
    return;
  }

  const item = itens.find((i) => i.id === itemId);
  if (!item) return;

  if (!item.perguntas) item.perguntas = [];

  item.perguntas.push({
    usuario: usuarioLogado.username,
    usuarioNome: `${usuarioLogado.nome} ${usuarioLogado.sobrenome}`,
    pergunta: pergunta,
    data: new Date().toISOString(),
    resposta: null,
  });

  adicionarNotificacao(
    item.anuncianteUsername,
    "❓ Nova Pergunta",
    `${usuarioLogado.nome} fez uma pergunta sobre "${item.nome}".`,
    item.id
  );

  salvarDadosCompletos();
  inputPergunta.value = "";
  carregarPerguntasItem(itemId);
  mostrarToast("Pergunta enviada com sucesso!", "success");
}

//3.0 Navegação entre telas
function esconderTodas(telas) {
  telas.forEach((tela) => {
    if (tela) tela.style.display = "none";
  });
}

function mostrarTela(tela) {
  const telas = [
    $("login-screen"),
    $("register-screen"),
    $("home-screen"),
    $("add-item-screen"),
    $("perfil-screen"),
  ];

  esconderTodas(telas);
  if (tela) tela.style.display = "block";

  if (tela === $("home-screen")) renderizarItens();
  if (tela === $("perfil-screen")) mostrarPerfil();

  const app = $("app-container");
  if (app) {
    app.style.display =
      tela === $("login-screen") || tela === $("register-screen")
        ? "flex"
        : "none";
  }
}

function renderizarLogin() {
  atualizarInfoNavBar();
  mostrarTela($("login-screen"));
}

function renderizarHome() {
  atualizarInfoNavBar();
  mostrarTela($("home-screen"));
}

function preencherSelects(selects, lista, opcaoPadrao) {
  selects.forEach((s) => {
    if (!s) return;
    const valorVazio = opcaoPadrao.includes("Todas") ? "Todas" : "";
    s.innerHTML =
      `<option value="${valorVazio}">${opcaoPadrao}</option>` +
      lista.map((item) => `<option value="${item}">${item}</option>`).join("");
  });
}

function carregarCategorias() {
  const cats = [
    "Sucata",
    "Eletrônicos",
    "Móveis",
    "Roupas",
    "Livros",
    "Jardinagem",
    "Utensílios",
    "Outros",
  ];
  preencherSelects(
    [$("filter-category"), $("notif-categoria")],
    cats,
    "Todas Categorias"
  );

  const c = $("item-categoria");
  if (c)
    c.innerHTML = cats
      .map((cat) => `<option value="${cat}">${cat}</option>`)
      .join("");
}

function carregarLocalidades() {
  const locs = [
    "Rio de Janeiro",
    "Niterói",
    "São Gonçalo",
    "Duque de Caxias",
    "Nova Iguaçu",
    "Maricá",
    "Itaboraí",
  ];
  preencherSelects(
    [$("filter-local"), $("notif-local")],
    locs,
    "Todas Localidades"
  );

  const l = $("item-local");
  if (l)
    l.innerHTML = locs
      .map((loc) => `<option value="${loc}">${loc}</option>`)
      .join("");
}

function atualizarInfoNavBar() {
  const user = $("nav-username");
  const img = $("nav-profile-img");

  if (usuarioLogado && user && img) {
    user.textContent = `Olá, ${usuarioLogado.nome}`;
    img.src = usuarioLogado.imagem || "https://via.placeholder.com/35";
    const app = $("app-container");
    if (app) app.style.display = "none";
  } else {
    const app = $("app-container");
    if (app) app.style.display = "flex";
    const home = $("home-screen");
    if (home) home.style.display = "none";
  }

  atualizarContadorNegociacoes();
}

function atualizarContadorNegociacoes() {
  const counter = $("negociacoes-counter");
  if (!usuarioLogado || !counter) return;

  const naoLidas = negociacoes.filter(
    (n) =>
      n.tipo === "aceito" &&
      !n.lida &&
      (n.anunciante === usuarioLogado.username ||
        n.vencedor === usuarioLogado.username)
  ).length;

  counter.textContent = naoLidas > 99 ? "99+" : naoLidas;
  counter.style.display = naoLidas ? "inline" : "none";
}

function obterMelhorLance(lances) {
  if (!lances?.length) return null;

  return [...lances].sort((a, b) => {
    if (a.tipo === "pago" && b.tipo !== "pago") return -1;
    if (a.tipo !== "pago" && b.tipo === "pago") return 1;
    if (a.tipo === "pago" && b.tipo === "pago") return b.valor - a.valor;
    if (a.tipo === "gratuito" && b.tipo === "cobro") return -1;
    if (a.tipo === "cobro" && b.tipo === "gratuito") return 1;
    if (a.tipo === "cobro" && b.tipo === "cobro") return a.valor - b.valor;
    return 0;
  })[0];
}

function obterStatusItem(item) {
  const agora = Date.now();
  const criado = new Date(item.criadoEm).getTime();
  const expira = item.tempoExpiracao * 3600000;
  const tempoRestante = criado + expira - agora;

  if (item.negociado) return "Concluído";
  if (item.cancelado) return "Cancelado";
  if (tempoRestante <= 0) return "Aguardando";
  return "Ativo";
}

function filtrarPorTempo(item, filtro) {
  if (filtro === "recentes" || filtro === "antigos") return true;

  const agora = Date.now();
  const criado = new Date(item.criadoEm).getTime();
  const diferenca = agora - criado;

  const tempos = {
    "24h": 24 * 3600000,
    "7d": 7 * 24 * 3600000,
    "15d": 15 * 24 * 3600000,
    "30d": 30 * 24 * 3600000,
  };
  return diferenca <= (tempos[filtro] || Infinity);
}

function renderizarItens() {
  const container = $("itens-container");
  if (!container) return;

  console.log("🎨 Renderizando itens... Total:", itens.length);

  //Aplicar filtros
  const cat = $("filter-category")?.value || "Todas";
  const loc = $("filter-local")?.value || "Todas";
  const txt = $("filter-text")?.value.toLowerCase() || "";
  const raio = parseInt($("filter-raio")?.value || "0");
  const filtroReputacao = $("filter-reputacao")?.value || "0";
  const filtroAnuncio = $("filter-anuncio")?.value || "recentes";
  const filtroStatus = $("filter-status")?.value || "todos";

  let filtrados = itens.filter((item) => {
    const passaCategoria = cat === "Todas" || item.categoria === cat;
    const passaLocalidade = loc === "Todas" || item.localidade === loc;
    const passaTexto =
      !txt ||
      item.nome.toLowerCase().includes(txt) ||
      item.descricao.toLowerCase().includes(txt);

    //Filtro de status
    let passaStatus = true;
    if (filtroStatus === "meus_anuncios") {
      passaStatus =
        usuarioLogado && item.anuncianteUsername === usuarioLogado.username;
    } else if (filtroStatus !== "todos") {
      passaStatus =
        obterStatusItem(item).toLowerCase() === filtroStatus.toLowerCase();
    }

    let passaRaio = true;
    if (raio > 0 && usuarioLogado) {
      const userCity = usuarioLogado.endereco.split(",").pop().trim();
      const distStr = calcularDistancia(userCity, item.localidade);
      const distancia = parseFloat(distStr.replace(" km", ""));
      passaRaio = !isNaN(distancia) && distancia <= raio;
    }

    const passaFavorito =
      !mostrarFavoritos ||
      (usuarioLogado && isFavoritoParaUsuario(item.id, usuarioLogado.username));

    const rep = obterReputacao(item.anuncianteUsername);
    const repVal = rep === "N/A" ? 0 : parseFloat(rep);
    const passaReputacao =
      parseFloat(filtroReputacao) === 0 ||
      repVal >= parseFloat(filtroReputacao);

    const passaTempo = filtrarPorTempo(item, filtroAnuncio);

    return (
      passaCategoria &&
      passaLocalidade &&
      passaTexto &&
      passaRaio &&
      passaFavorito &&
      passaReputacao &&
      passaStatus &&
      passaTempo
    );
  });

  console.log("✅ Itens após filtros:", filtrados.length);

  filtrados.sort((a, b) => {
    const dataA = new Date(a.criadoEm);
    const dataB = new Date(b.criadoEm);
    return filtroAnuncio === "antigos" ? dataA - dataB : dataB - dataA;
  });

  container.innerHTML =
    filtrados.length === 0
      ? '<div class="col-12"><p class="text-center text-muted mt-5">Nenhum item encontrado.</p></div>'
      : filtrados.map((item) => criarCardItem(item)).join("");

  //Adicionar eventos
  document.querySelectorAll(".dar-lance-btn").forEach((btn) => {
    btn.onclick = (e) => mostrarLanceModal(parseInt(e.target.dataset.itemid));
  });

  document.querySelectorAll(".ver-lances-btn").forEach((btn) => {
    btn.onclick = (e) => {
      const item = itens.find(
        (i) => i.id === parseInt(e.target.dataset.itemid)
      );
      if (item) mostrarLancesModal(item);
    };
  });

  document.querySelectorAll(".remover-anuncio-btn").forEach((btn) => {
    btn.onclick = (e) => removerItemPorId(parseInt(e.target.dataset.itemid));
  });

  document.querySelectorAll(".editar-item-btn").forEach((btn) => {
    btn.onclick = (e) =>
      abrirModalEditarItem(parseInt(e.target.dataset.itemid));
  });

  document.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.onclick = (e) => toggleFavorito(parseInt(e.target.dataset.itemid));
  });

  atualizarContadorNotificacoes();
}

function criarCardItem(item) {
  const ehFav =
    usuarioLogado && isFavoritoParaUsuario(item.id, usuarioLogado.username);
  const rep = obterReputacao(item.anuncianteUsername);
  const criado = new Date(item.criadoEm).getTime();
  const expira = item.tempoExpiracao * 3600000;
  const rest = criado + expira - Date.now();
  const acabou = rest <= 0;
  const fin = item.negociado || item.cancelado;

  const statusItem = obterStatusItem(item);
  const crit = !fin && !acabou && isTempoCritico(item) ? "item-critico" : "";

  const dist = usuarioLogado
    ? calcularDistancia(
        usuarioLogado.endereco.split(",").pop().trim(),
        item.localidade
      )
    : "Faça Login";

  const dono =
    usuarioLogado && usuarioLogado.username === item.anuncianteUsername;
  const best = obterMelhorLance(item.lances);

  let meuLanceTxt = "";
  if (usuarioLogado && !dono) {
    const meuLance = item.lances?.find(
      (l) => l.usuario === usuarioLogado.username
    );
    if (meuLance) {
      meuLanceTxt =
        meuLance.tipo === "pago"
          ? `R$ ${meuLance.valor.toFixed(2)} (Paga)`
          : meuLance.tipo === "gratuito"
          ? "Retira Grátis"
          : `R$ ${meuLance.valor.toFixed(2)} (Cobra)`;
    }
  }

  const lanceLen = item.lances?.length || 0;
  const btns = gerarBotoesCard(item, dono, acabou, fin, lanceLen);

  const bestTxt = best
    ? best.tipo === "pago"
      ? `<span class="badge bg-success">R$ ${best.valor.toFixed(
          2
        )} (Paga)</span>`
      : best.tipo === "gratuito"
      ? '<span class="badge bg-secondary">Retira Grátis</span>'
      : `<span class="badge bg-primary">R$ ${best.valor.toFixed(
          2
        )} (Cobra)</span>`
    : "Nenhum";

  const numFotos = item.imagens?.length || 1;
  const fotoIndicador =
    numFotos > 1
      ? `<span class="badge bg-dark position-absolute top-0 end-0 m-2">📷 ${numFotos}</span>`
      : "";

  const descricaoCorta =
    item.descricao.length > 60
      ? item.descricao.slice(0, 60) + "..."
      : item.descricao;
  const badgeStatus =
    statusItem === "Ativo"
      ? "success"
      : statusItem === "Aguardando"
      ? "warning"
      : "secondary";

  return `
    <div class="col-xl-3 col-lg-4 col-md-6 col-12">
      <div class="card item-card ${crit} h-100">
        <div class="position-relative" style="cursor:pointer;" onclick="mostrarDetalhesItem(${
          item.id
        })">
          <img src="${item.imagem}" class="card-img-top" alt="${
    item.nome
  }" style="height:200px;object-fit:cover;">
          ${fotoIndicador}
        </div>
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0">${item.nome}</h5>
            <button class="btn btn-sm ${
              ehFav ? "btn-warning" : "btn-outline-warning"
            } fav-btn" data-itemid="${item.id}" ${
    usuarioLogado ? "" : "disabled"
  }>
              ${ehFav ? "⭐" : "☆"}
            </button>
          </div>
          <p class="text-muted small mb-1"><strong>Reputação:</strong> ${rep}</p>
          <p class="text-muted small mb-1">${descricaoCorta}</p>
          <p class="small mb-1"><strong>Anunciante:</strong> ${
            item.anunciante
          }</p>
          <p class="small mb-1"><strong>Local:</strong> ${
            item.localidade
          } (${dist})</p>
          <p class="small mb-1"><strong>Quantidade:</strong> ${
            item.quantidade
          }</p>
          <p class="small mb-1"><strong>Melhor Oferta:</strong> ${bestTxt}</p>
          ${
            meuLanceTxt
              ? `<p class="small mb-1"><strong>Meu Lance:</strong> <span class="badge bg-info">${meuLanceTxt}</span></p>`
              : ""
          }
          <p class="small mb-2"><strong>Status:</strong> <span class="badge bg-${badgeStatus}">${statusItem}</span></p>
          <p class="timer small mb-2" data-itemid="${item.id}" data-criadoem="${
    item.criadoEm
  }" data-tempoexpiracao="${item.tempoExpiracao}" data-datafim="${
    item.dataFinalizacao || ""
  }" data-status="${fin ? "finalizado" : acabou ? "expirado" : "ativo"}"></p>
          <div class="d-flex gap-2 mt-auto">${btns}</div>
        </div>
      </div>
    </div>
  `;
}

function gerarBotoesCard(item, dono, acabou, fin, lanceLen) {
  if (item.negociado) {
    return dono
      ? `<button class="btn btn-sm btn-success w-50" disabled>Concluída</button>
         <button class="btn btn-sm btn-danger remover-anuncio-btn w-50" data-itemid="${item.id}">Remover</button>`
      : '<button class="btn btn-sm btn-success w-100" disabled>Negociação Concluída</button>';
  }

  if (item.cancelado) {
    return dono
      ? `<button class="btn btn-sm btn-danger remover-anuncio-btn w-100" data-itemid="${item.id}">Remover Anúncio</button>`
      : '<button class="btn btn-sm btn-secondary w-100" disabled>Cancelado</button>';
  }

  if (dono) {
    if (acabou) {
      return lanceLen
        ? `<button class="btn btn-sm btn-primary ver-lances-btn w-50" data-itemid="${item.id}">Escolher Vencedor (${lanceLen})</button>
           <button class="btn btn-sm btn-warning editar-item-btn w-50" data-itemid="${item.id}">Editar</button>`
        : `<button class="btn btn-sm btn-danger remover-anuncio-btn w-100" data-itemid="${item.id}">Remover</button>`;
    }
    const disabledLances = lanceLen ? "" : "disabled";
    return `<button class="btn btn-sm btn-primary ver-lances-btn w-50" data-itemid="${item.id}" ${disabledLances}>Ver Lances (${lanceLen})</button>
            <button class="btn btn-sm btn-warning editar-item-btn w-25" data-itemid="${item.id}">Editar</button>
            <button class="btn btn-sm btn-danger remover-anuncio-btn w-25" data-itemid="${item.id}">Remover</button>`;
  }

  if (acabou) {
    return '<button class="btn btn-sm btn-warning w-100" disabled>Aguardando Negociação</button>';
  }

  const ja =
    usuarioLogado &&
    item.lances?.some((l) => l.usuario === usuarioLogado.username);
  const textoBotao = ja ? "Alterar Lance" : "Dar Lance";
  return `<button class="btn btn-sm btn-success dar-lance-btn w-100" data-itemid="${
    item.id
  }" ${usuarioLogado ? "" : "disabled"}>${textoBotao}</button>`;
}

//3.1 Detalhes dos itens
function mostrarDetalhesItem(itemId) {
  const item = itens.find((i) => i.id === itemId);
  if (!item) return;

  itemDetalhesAtual = item;
  const modalEl = $("detalhes-item-modal");
  if (!modalEl) return;

  $("detalhes-item-nome").textContent = item.nome;
  $("detalhes-item-categoria").textContent = item.categoria;
  $("detalhes-item-descricao").textContent = item.descricao;
  $("detalhes-item-quantidade").textContent = item.quantidade;
  $("detalhes-item-local").textContent = item.localidade;
  $("detalhes-item-anunciante").textContent = item.anunciante;
  $("detalhes-item-reputacao").textContent = obterReputacao(
    item.anuncianteUsername
  );

  const imagens = item.imagens || [item.imagem];
  const carouselInner = $("detalhes-carousel-inner");
  const carouselIndicators = $("detalhes-carousel-indicators");
  const contadorFotos = $("contador-fotos");

  carouselInner.innerHTML = imagens
    .map(
      (img, i) => `
    <div class="carousel-item ${i === 0 ? "active" : ""}">
      <img src="${img}" class="d-block w-100" alt="${
        item.nome
      }" style="height:400px;object-fit:contain;background:#f8f9fa;">
    </div>
  `
    )
    .join("");

  carouselIndicators.innerHTML = imagens
    .map(
      (_, i) => `
    <button type="button" data-bs-target="#detalhesCarousel" data-bs-slide-to="${i}" ${
        i === 0 ? 'class="active" aria-current="true"' : ""
      } aria-label="Slide ${i + 1}"></button>
  `
    )
    .join("");

  if (contadorFotos) contadorFotos.textContent = `1/${imagens.length}`;

  const carousel = document.querySelector("#detalhesCarousel");
  if (carousel) {
    carousel.addEventListener("slide.bs.carousel", (event) => {
      if (contadorFotos)
        contadorFotos.textContent = `${event.to + 1}/${imagens.length}`;
    });
  }

  const botoesAcao = $("detalhes-botoes-acao");
  const dono =
    usuarioLogado && usuarioLogado.username === item.anuncianteUsername;
  const criado = new Date(item.criadoEm).getTime();
  const expira = item.tempoExpiracao * 3600000;
  const acabou = criado + expira - Date.now() <= 0;

  if (botoesAcao) {
    botoesAcao.innerHTML = "";
    if (dono) {
      botoesAcao.innerHTML = `<button class="btn btn-warning" onclick="abrirModalEditarItem(${item.id})">Editar Anúncio</button>`;
      if (!item.negociado && !item.cancelado) {
        botoesAcao.innerHTML += `<button class="btn btn-danger" onclick="removerItemPorId(${item.id})">Remover</button>`;
      }
    } else if (!item.negociado && !item.cancelado && !acabou && usuarioLogado) {
      const jaLancou = item.lances?.some(
        (l) => l.usuario === usuarioLogado.username
      );
      const textoBotao = jaLancou ? "Alterar Lance" : "Dar Lance";
      botoesAcao.innerHTML = `<button class="btn btn-success" onclick="mostrarLanceModal(${item.id})">${textoBotao}</button>`;
    }
  }

  carregarPerguntasItem(itemId);
  abrirModal(modalEl);
}

//3.2 Editar anúncio
function abrirModalEditarItem(itemId) {
  const item = itens.find((i) => i.id === itemId);
  if (
    !item ||
    !usuarioLogado ||
    item.anuncianteUsername !== usuarioLogado.username
  ) {
    mostrarToast("Você não pode editar este item.", "warning");
    return;
  }

  const modal = $("modal-editar-item");
  if (!modal) return;

  $("editar-item-id").value = item.id;
  $("editar-item-nome").value = item.nome;
  $("editar-item-descricao").value = item.descricao;

  const gridImagens = $("grid-imagens-atuais");
  if (gridImagens) {
    const imagens = item.imagens || [item.imagem];
    gridImagens.innerHTML = imagens
      .map((img, i) => {
        const botaoRemover =
          imagens.length > 1
            ? `<button type="button" class="btn-remover-imagem" onclick="removerImagemItem(${item.id}, ${i})">×</button>`
            : "";
        return `
        <div class="wrapper-imagem-edicao">
          <img src="${img}" alt="Foto ${i + 1}">
          ${botaoRemover}
        </div>
      `;
      })
      .join("");
  }

  abrirModal(modal);
}

function removerImagemItem(itemId, imgIndex) {
  const item = itens.find((i) => i.id === itemId);
  if (!item || !item.imagens || item.imagens.length <= 1) {
    mostrarToast("Não é possível remover a única imagem do item.", "warning");
    return;
  }

  if (!confirm("Remover esta imagem?")) return;

  item.imagens.splice(imgIndex, 1);
  item.imagem = item.imagens[0];

  for (let i = 0; i < itens.length; i++) {
    if (itens[i].id === itemId) {
      itens[i] = item;
      break;
    }
  }

  if (itemDetalhesAtual && itemDetalhesAtual.id === itemId) {
    itemDetalhesAtual = item;
  }

  salvarDadosCompletos();

  const homeScreen = $("home-screen");
  if (homeScreen && homeScreen.style.display === "block") renderizarItens();

  fecharModal($("modal-editar-item"));
  setTimeout(() => abrirModalEditarItem(itemId), 100);

  mostrarToast("Foto removida com sucesso!", "success");
}

function mostrarPerfil() {
  if (!usuarioLogado) return;

  const perfilImg = $("perfil-imagem");
  const perfilRepInfo = $("perfil-reputacao-info");
  const perfilPontosEco = $("perfil-pontos-eco");

  if (perfilImg) perfilImg.src = usuarioLogado.imagem;

  if (perfilRepInfo) {
    const numAvaliacoes = usuarioLogado.avaliacoesRecebidas?.length || 0;
    perfilRepInfo.textContent = `Reputação: ${obterReputacao(
      usuarioLogado.username
    )} (${numAvaliacoes} avaliações)`;
  }

  if (perfilPontosEco) {
    perfilPontosEco.textContent = `Eco Pontos: ${
      usuarioLogado.pontosEco || 0
    } 🌿`;
  }

  const campos = ["nome", "sobrenome", "email", "telefone", "endereco"];
  campos.forEach((campo) => {
    const el = $(`perfil-${campo}-input`);
    if (el) el.value = usuarioLogado[campo] || "";
  });

  const lista = $("perfil-avaliacoes-pendentes");
  if (lista) {
    lista.innerHTML =
      '<li class="list-group-item active bg-success">Avaliações Pendentes</li>';
    const pend = usuarioLogado.avaliacoesPendentes || [];

    if (pend.length === 0) {
      lista.innerHTML +=
        '<li class="list-group-item text-muted">Nenhuma avaliação pendente.</li>';
    } else {
      pend.forEach((p) => {
        const item = itens.find((i) => i.id === p.itemId);
        const aval = obterUsuarioPorUsername(p.avaliado);

        if (item && aval) {
          lista.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              Avaliar ${aval.nome} sobre <strong>${item.nome}</strong>
              <button class="btn btn-sm btn-success avaliar-btn" 
                data-itemid="${p.itemId}" 
                data-avaliado="${p.avaliado}"
                data-itemnome="${item.nome}" 
                data-avalianome="${aval.nome}">
                Avaliar
              </button>
            </li>
          `;
        }
      });
    }

    document.querySelectorAll(".avaliar-btn").forEach((btn) => {
      btn.onclick = (e) => mostrarAvaliacaoModal(e.target.dataset);
    });
  }

  mostrarTela($("perfil-screen"));
}

//4.0 Lances nos anúncios
let lanceModalInstance, lancesAnuncianteModalInstance;

function mostrarLanceModal(itemId) {
  if (!usuarioLogado) {
    mostrarToast("Faça login para dar um lance.", "warning");
    return;
  }

  const item = itens.find((i) => i.id === itemId);
  if (!item || item.negociado || item.cancelado) {
    mostrarToast("Este item não está mais disponível.", "warning");
    return;
  }

  const criado = new Date(item.criadoEm).getTime();
  const expira = item.tempoExpiracao * 3600000;
  const tempoRestante = criado + expira - Date.now();

  if (tempoRestante <= 0) {
    mostrarToast("Este item já expirou e não aceita mais lances.", "warning");
    return;
  }

  itemAtualLance = item;
  $(
    "lance-item-nome"
  ).textContent = `Item: ${item.nome} (${item.quantidade} unidade(s))`;

  const lanceExistente = item.lances?.find(
    (l) => l.usuario === usuarioLogado.username
  );
  $("tipo-lance-select").value = lanceExistente?.tipo || "pago";
  $("valor-lance-input").value =
    lanceExistente && lanceExistente.tipo !== "gratuito"
      ? lanceExistente.valor.toFixed(2)
      : "0.00";
  $("lance-valor-container").style.display =
    $("tipo-lance-select").value === "gratuito" ? "none" : "block";
  $("quantidade-lance-input").value = lanceExistente?.quantidade || 1;
  $("quantidade-lance-input").max = item.quantidade;
  $("lance-transporte-eco").value = lanceExistente?.transporteEco || "";

  if (lanceModalInstance) lanceModalInstance.show();
}

function mostrarLancesModal(item) {
  if (!usuarioLogado || item.anuncianteUsername !== usuarioLogado.username) {
    mostrarToast(
      "Apenas o anunciante pode visualizar os lances recebidos.",
      "warning"
    );
    return;
  }

  itemAtualLance = item;
  const lancesList = $("lances-anunciante-list");
  $("lances-anunciante-item-nome").textContent = item.nome;
  lancesList.innerHTML = "";

  const tempoAcabou =
    new Date(item.criadoEm).getTime() +
      item.tempoExpiracao * 3600000 -
      Date.now() <=
    0;
  const itemNegociado = item.negociado || item.cancelado;
  $("recusar-tudo-btn").style.display =
    item.lances?.length > 0 && tempoAcabou && !itemNegociado ? "block" : "none";

  if (!item.lances?.length) {
    lancesList.innerHTML =
      '<li class="list-group-item text-center text-muted">Nenhum lance recebido ainda.</li>';
  } else {
    const lancesOrdenados = [...item.lances].sort((a, b) => {
      if (a.tipo === "pago" && b.tipo !== "pago") return -1;
      if (a.tipo !== "pago" && b.tipo === "pago") return 1;
      if (a.tipo === "pago" && b.tipo === "pago") return b.valor - a.valor;
      if (a.tipo === "gratuito" && b.tipo === "cobro") return -1;
      if (a.tipo === "cobro" && b.tipo === "gratuito") return 1;
      if (a.tipo === "cobro" && b.tipo === "cobro") return a.valor - b.valor;
      return 0;
    });

    lancesOrdenados.forEach((lance) => {
      const licitante = obterUsuarioPorUsername(lance.usuario) || {
        nome: lance.usuario,
        username: lance.usuario,
        telefone: "-",
        endereco: "-",
      };
      const reputacao = obterReputacao(lance.usuario);

      const valorStr =
        lance.tipo === "pago"
          ? `Paga: R$ ${lance.valor.toFixed(2)}`
          : lance.tipo === "gratuito"
          ? "Retira Grátis"
          : `Cobra: R$ ${lance.valor.toFixed(2)} p/ Retirar`;

      const btnClasse =
        lance.tipo === "pago"
          ? "btn-success"
          : lance.tipo === "gratuito"
          ? "btn-secondary"
          : "btn-danger";
      const negociadoComEste =
        item.negociado && item.negociadoCom === lance.usuario;
      const transporteEco = lance.transporteEco
        ? `<span class="badge bg-success ms-2">🌿 ${lance.transporteEco.replace(
            "_",
            " "
          )}</span>`
        : "";

      let btnAcaoHtml = "";
      if (itemNegociado) {
        btnAcaoHtml = negociadoComEste
          ? '<button class="btn btn-sm btn-info w-100" disabled>Negociado</button>'
          : '<button class="btn btn-sm btn-secondary w-100" disabled>Finalizado</button>';
      } else if (!tempoAcabou) {
        btnAcaoHtml =
          '<button class="btn btn-sm btn-warning w-100" disabled>Aguarde Expirar</button>';
      } else {
        btnAcaoHtml = `
          <div class="d-grid gap-1">
            <button class="btn btn-sm ${btnClasse} aceitar-lance-btn" 
              data-itemid="${item.id}" 
              data-usuario="${lance.usuario}" 
              data-usuarionome="${licitante.nome}"
              data-tipo="${lance.tipo}"
              data-transporte="${lance.transporteEco || ""}">
              Aceitar
            </button>
            <button class="btn btn-sm btn-outline-danger recusar-lance-btn"
              data-itemid="${item.id}"
              data-usuario="${lance.usuario}"
              data-usuarionome="${licitante.nome}">
              Recusar
            </button>
          </div>
        `;
      }

      lancesList.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center ${
          negociadoComEste ? "bg-light-green" : ""
        }">
          <div class="flex-grow-1">
            <div class="fw-bold">${licitante.nome} (${licitante.username})</div>
            <small>Reputação: ${reputacao}</small>${transporteEco}<br>
            <small>Lance: ${valorStr}</small><br>
            <small>Quantidade: ${lance.quantidade || 1}</small><br>
            <small class="text-muted">Data: ${new Date(
              lance.data
            ).toLocaleString()}</small><br>
            <small class="text-muted">Contato: ${licitante.telefone || "-"}, ${
        licitante.endereco || "-"
      }</small>
          </div>
          <div class="ms-3" style="width: 140px;">${btnAcaoHtml}</div>
        </li>
      `;
    });

    document.querySelectorAll(".aceitar-lance-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => aceitarLance(e.target.dataset));
    });
    document.querySelectorAll(".recusar-lance-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => recusarLance(e.target.dataset));
    });
  }

  if (lancesAnuncianteModalInstance) lancesAnuncianteModalInstance.show();
}

//5.0 Aceitar ou recusar lances
function aceitarLance(data) {
  if (
    !confirm(
      `Aceitar o lance de ${data.usuarionome}? Isso finalizará o anúncio.`
    )
  )
    return;

  const item = itens.find((i) => i.id === Number(data.itemid));
  if (!item) return;

  item.negociado = true;
  item.expirado = true;
  item.cancelado = false;
  item.status = "negociado";
  item.negociadoCom = data.usuario;
  marcarItemComoFinalizado(item);

  if (data.transporte) {
    const bonus = calcularBonusEcologico(data.transporte);
    if (bonus.pontos > 0) {
      adicionarPontosEco(data.usuario, bonus.pontos);
      adicionarPontosEco(item.anuncianteUsername, bonus.pontos);
      adicionarNotificacao(
        data.usuario,
        "🌿 Bônus Ecológico!",
        bonus.descricao,
        item.id
      );
      adicionarNotificacao(
        item.anuncianteUsername,
        "🌿 Bônus Ecológico!",
        `Você também ganhou ${bonus.pontos} pontos eco por negociar com transporte sustentável!`,
        item.id
      );
    }
  }

  adicionarNotificacao(
    data.usuario,
    "🎉 Parabéns! Você venceu o lance!",
    `Seu lance foi aceito pelo anunciante ${item.anunciante} no item **${item.nome}**. Entre em contato para finalizar!`,
    item.id
  );

  adicionarNotificacao(
    item.anuncianteUsername,
    "🎉 Parabéns! Negociação Concluída!",
    `Você aceitou o lance de ${data.usuarionome} para o item **${item.nome}**. Entre em contato para finalizar!`,
    item.id
  );

  item.lances.forEach((l) => {
    if (l.usuario !== data.usuario) {
      adicionarNotificacao(
        l.usuario,
        `💔 Lance Perdido: ${item.nome}`,
        `O item **${item.nome}** foi negociado com outro licitante.`,
        item.id
      );
    }
  });

  const anunciante = obterUsuarioPorUsername(item.anuncianteUsername);
  const vencedor = obterUsuarioPorUsername(data.usuario);

  if (!anunciante.avaliacoesRecebidas) anunciante.avaliacoesRecebidas = [];
  if (!vencedor.avaliacoesRecebidas) vencedor.avaliacoesRecebidas = [];
  if (!anunciante.avaliacoesPendentes) anunciante.avaliacoesPendentes = [];
  if (!vencedor.avaliacoesPendentes) vencedor.avaliacoesPendentes = [];

  const jaTemPendenteAnunciante = anunciante.avaliacoesPendentes.some(
    (p) => p.itemId === item.id && p.avaliado === data.usuario
  );

  if (!jaTemPendenteAnunciante) {
    anunciante.avaliacoesPendentes.push({
      itemId: item.id,
      avaliado: data.usuario,
      itemNome: item.nome,
      avaliadoNome: vencedor?.nome || data.usuario,
    });
  }

  const jaTemPendenteVencedor = vencedor.avaliacoesPendentes.some(
    (p) => p.itemId === item.id && p.avaliado === item.anuncianteUsername
  );

  if (!jaTemPendenteVencedor) {
    vencedor.avaliacoesPendentes.push({
      itemId: item.id,
      avaliado: item.anuncianteUsername,
      itemNome: item.nome,
      avaliadoNome: anunciante?.nome || item.anunciante,
    });
  }

  criarConversaNegociacao(item, data.usuario);

  registrarNegociacao({
    itemId: item.id,
    itemNome: item.nome,
    tipo: "aceito",
    vencedor: data.usuario,
    anunciante: item.anuncianteUsername,
    data: new Date().toISOString(),
    lances: item.lances.slice(),
    lida: false,
  });

  salvarDadosCompletos();
  if (lancesAnuncianteModalInstance) lancesAnuncianteModalInstance.hide();
  renderizarItens();
  mostrarToast(
    `Lance de ${data.usuarionome} aceito. O vencedor foi notificado.`,
    "success"
  );
}

function recusarLance(data) {
  if (!confirm(`Deseja recusar o lance de ${data.usuarionome}?`)) return;

  const item = itens.find((i) => i.id === Number(data.itemid));
  if (!item) return;

  const indice = item.lances.findIndex((l) => l.usuario === data.usuario);
  if (indice === -1) return;

  const lanceRemovido = item.lances.splice(indice, 1)[0];

  adicionarNotificacao(
    data.usuario,
    `❌ Lance Recusado: ${item.nome}`,
    `Seu lance para o item **${item.nome}** foi recusado pelo anunciante.`,
    item.id
  );

  registrarNegociacao({
    itemId: item.id,
    itemNome: item.nome,
    tipo: "recusa_lance",
    usuario: data.usuario,
    anunciante: item.anuncianteUsername,
    data: new Date().toISOString(),
    lance: lanceRemovido,
  });

  salvarDadosCompletos();
  mostrarLancesModal(item);
  renderizarItens();
}
//6.0 Finalizar item sem acordo
function marcarSemAcordo() {
  if (!itemAtualLance) return;
  if (!confirm(`Marcar "${itemAtualLance.nome}" como "Sem Acordo"?`)) return;

  const item = itemAtualLance;
  item.cancelado = true;
  item.expirado = true;
  item.negociado = false;
  item.status = "cancelado";
  marcarItemComoFinalizado(item);

  item.lances.forEach((l) => {
    adicionarNotificacao(
      l.usuario,
      "❌ Item Finalizado (Sem Acordo)",
      `O item **${item.nome}** foi finalizado sem acordo.`,
      item.id
    );
  });

  registrarNegociacao({
    itemId: item.id,
    itemNome: item.nome,
    tipo: "sem_acordo",
    anunciante: item.anuncianteUsername,
    data: new Date().toISOString(),
    lances: item.lances.slice(),
  });

  salvarDadosCompletos();
  if (lancesAnuncianteModalInstance) lancesAnuncianteModalInstance.hide();
  renderizarItens();
  mostrarToast(
    "Anúncio marcado como 'Sem Acordo'. Licitantes foram notificados.",
    "info"
  );
}

//7.0 Sistema de conversa
function criarConversaNegociacao(item, vencedorUsername) {
  const vencedor = obterUsuarioPorUsername(vencedorUsername);
  const anunciante = obterUsuarioPorUsername(item.anuncianteUsername);
  if (!vencedor || !anunciante) return;

  const conversaId = `${item.id}_${Date.now()}`;

  mensagens.push({
    id: `${conversaId}_2`,
    conversaId,
    itemId: item.id,
    itemNome: item.nome,
    de: item.anuncianteUsername,
    para: vencedorUsername,
    texto: `Olá ${vencedor.nome}! Obrigado pelo interesse. Quando você pode retirar o item?`,
    data: new Date(Date.now() + 1000).toISOString(),
    lida: false,
  });

  salvarDadosCompletos();
}

function mostrarConversas() {
  if (!usuarioLogado) return;

  const lista = $("conversas-list");
  if (!lista) return;

  const minhasConversas = {};

  mensagens.forEach((msg) => {
    const participaConversa =
      (Array.isArray(msg.para) && msg.para.includes(usuarioLogado.username)) ||
      msg.para === usuarioLogado.username ||
      msg.de === usuarioLogado.username;

    if (participaConversa) {
      if (!minhasConversas[msg.conversaId]) {
        minhasConversas[msg.conversaId] = {
          itemNome: msg.itemNome,
          mensagens: [],
        };
      }
      minhasConversas[msg.conversaId].mensagens.push(msg);
    }
  });

  lista.innerHTML = "";
  const conversasArray = Object.keys(minhasConversas);

  if (conversasArray.length === 0) {
    lista.innerHTML =
      '<li class="list-group-item text-muted text-center">Nenhuma conversa ainda.</li>';
    return;
  }

  conversasArray.forEach((conversaId) => {
    const dados = minhasConversas[conversaId];
    const ultimaMsg = dados.mensagens[dados.mensagens.length - 1];
    const naoLidas = dados.mensagens.filter(
      (m) => !m.lida && m.de !== usuarioLogado.username
    ).length;
    const badgeNaoLidas =
      naoLidas > 0 ? `<span class="badge bg-danger">${naoLidas}</span>` : "";
    const textoPreview =
      ultimaMsg.texto.substring(0, 50) +
      (ultimaMsg.texto.length > 50 ? "..." : "");

    lista.innerHTML += `
      <li class="list-group-item list-group-item-action" style="cursor:pointer;" onclick="abrirConversa('${conversaId}')">
        <div class="d-flex justify-content-between">
          <strong>${dados.itemNome}</strong>${badgeNaoLidas}
        </div>
        <small class="text-muted">${textoPreview}</small>
      </li>
    `;
  });
}

function abrirConversa(conversaId) {
  const conversaMsgs = mensagens.filter((m) => m.conversaId === conversaId);
  if (conversaMsgs.length === 0) return;

  const chatContainer = $("chat-mensagens");
  const chatItemNome = $("chat-item-nome");

  chatItemNome.textContent = conversaMsgs[0].itemNome;
  chatContainer.innerHTML = conversaMsgs
    .map((msg) => {
      const ehMinha = msg.de === usuarioLogado.username;
      const remetente =
        msg.de === "sistema"
          ? "Sistema"
          : obterUsuarioPorUsername(msg.de)?.nome || msg.de;
      const align = ehMinha ? "text-end" : "text-start";
      const bgColor =
        msg.de === "sistema"
          ? "bg-info text-white"
          : ehMinha
          ? "bg-success text-white"
          : "bg-light";

      if (!msg.lida && msg.de !== usuarioLogado.username) msg.lida = true;

      return `
      <div class="${align} mb-2">
        <div class="d-inline-block ${bgColor} rounded p-2" style="max-width:70%;">
          <small class="fw-bold">${remetente}</small><br>
          ${msg.texto}<br>
          <small class="text-muted">${new Date(
            msg.data
          ).toLocaleTimeString()}</small>
        </div>
      </div>
    `;
    })
    .join("");

  salvarDadosCompletos();
  chatContainer.scrollTop = chatContainer.scrollHeight;
  chatContainer.dataset.conversaId = conversaId;

  const modalChat = $("chat-modal");
  if (modalChat) abrirModal(modalChat);
}

//8.0 Avaliações
function mostrarAvaliacaoModal(data) {
  if (!usuarioLogado) return;

  const encontrou = usuarioLogado.avaliacoesPendentes?.some(
    (p) =>
      String(p.itemId) === String(data.itemid) && p.avaliado === data.avaliado
  );

  if (!encontrou) {
    mostrarToast(
      "Não há avaliação pendente para este usuário/item.",
      "warning"
    );
    return;
  }

  $("avaliacao-nome-usuario").textContent = data.avalianome;
  $("avaliacao-nome-item").textContent = data.itemnome;
  $("avaliacao-avaliado-username").value = data.avaliado;
  $("avaliacao-item-id").value = data.itemid;
  $("avaliacao-estrelas").value = "";
  $("avaliacao-comentario").value = "";

  document
    .querySelectorAll(".estrela")
    .forEach((e) => e.classList.remove("ativa"));

  const modalEl = $("avaliacao-modal");
  abrirModal(modalEl);
}

function inicializarSistemaEstrelas() {
  const containerEstrelas = $("container-estrelas");
  if (!containerEstrelas) return;

  const estrelas = containerEstrelas.querySelectorAll(".estrela");

  estrelas.forEach((estrela, idx) => {
    estrela.addEventListener("click", function () {
      const valor = parseInt(this.dataset.valor);
      $("avaliacao-estrelas").value = valor;

      estrelas.forEach((e, i) => {
        if (i < valor) e.classList.add("ativa");
        else e.classList.remove("ativa");
      });
    });

    estrela.addEventListener("mouseenter", function () {
      const valor = parseInt(this.dataset.valor);
      estrelas.forEach((e, i) => {
        if (i < valor) {
          e.style.filter = "grayscale(0%)";
          e.style.opacity = "1";
        }
      });
    });
  });

  containerEstrelas.addEventListener("mouseleave", function () {
    const valorSelecionado = parseInt($("avaliacao-estrelas").value) || 0;
    estrelas.forEach((e, i) => {
      if (i >= valorSelecionado) {
        e.style.filter = "grayscale(100%)";
        e.style.opacity = "0.5";
      }
    });
  });
}

//9.0 Notificações
function adicionarNotificacao(username, titulo, mensagem, itemId) {
  notificacoesRecebidas.unshift({
    usuario: username,
    titulo,
    mensagem,
    itemId,
    lida: false,
    data: new Date().toISOString(),
  });
  salvarNotificacoesCriticas();
  atualizarContadorNotificacoes();
}

function atualizarContadorNotificacoes() {
  const c = $("notif-counter");
  if (!usuarioLogado || !c) return;

  const n = notificacoesRecebidas.filter(
    (notif) => notif.usuario === usuarioLogado.username && !notif.lida
  ).length;

  c.textContent = n > 99 ? "99+" : n;
  c.style.display = n ? "inline" : "none";
}

function mostrarHistoricoNotificacoes() {
  if (!usuarioLogado) return;

  const notifList = $("notificacoes-list");
  const vazio = $("notificacoes-vazio-msg");

  const minhas = notificacoesRecebidas
    .filter((n) => n.usuario === usuarioLogado.username)
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  notifList.innerHTML = "";

  if (minhas.length === 0) {
    vazio.style.display = "block";
  } else {
    vazio.style.display = "none";

    minhas.forEach((n) => {
      const li = document.createElement("li");
      li.className = `list-group-item d-flex justify-content-between align-items-start ${
        n.lida ? "list-group-item-light" : "list-group-item-warning"
      }`;
      li.dataset.id = n.data;

      const btnTexto = n.lida ? "Lida" : "Marcar Lida";
      const btnDisabled = n.lida ? "disabled" : "";

      li.innerHTML = `
        <div class="me-auto">
          <div class="fw-bold">${n.titulo}</div>${n.mensagem}
          <small class="text-muted d-block mt-1">${new Date(
            n.data
          ).toLocaleString()}</small>
        </div>
        <button class="btn btn-sm btn-outline-secondary marcar-lida-btn" data-id="${
          n.data
        }" style="min-width:80px" ${btnDisabled}>
          ${btnTexto}
        </button>
      `;

      notifList.appendChild(li);
    });

    notifList.querySelectorAll(".marcar-lida-btn").forEach((btn) => {
      btn.onclick = function (e) {
        const dataId = e.target.dataset.id;
        const notif = notificacoesRecebidas.find(
          (n) => n.usuario === usuarioLogado.username && n.data === dataId
        );

        if (notif && !notif.lida) {
          notif.lida = true;
          salvarNotificacoesCriticas();
          mostrarHistoricoNotificacoes();
        }
      };
    });
  }

  atualizarContadorNotificacoes();
}

function limparNotificacoes() {
  if (!usuarioLogado) return;

  if (!confirm("Tem certeza que deseja limpar todas as notificações?")) return;

  notificacoesRecebidas = notificacoesRecebidas.filter(
    (n) => n.usuario !== usuarioLogado.username
  );
  salvarNotificacoesCriticas();
  mostrarHistoricoNotificacoes();
  atualizarContadorNotificacoes();
  mostrarToast("Notificações limpas com sucesso!", "success");
}

function renderizarNotificacoes() {
  const container = $("notificacoes-container");
  if (!usuarioLogado || !container) {
    if (container) container.innerHTML = "";
    return;
  }

  const u = usuarioLogado.username;
  let html = "";

  notificacoesCategorias
    .filter((n) => n.usuario === u)
    .forEach((n) => {
      html += `<span class="badge bg-primary me-1 mb-1">Cat: ${n.categoria} 
      <button class="btn-close btn-close-white btn-sm ms-1 desativar-notif-btn" data-type="cat" data-value="${n.categoria}"></button></span>`;
    });

  notificacoesLocais
    .filter((n) => n.usuario === u)
    .forEach((n) => {
      html += `<span class="badge bg-info me-1 mb-1">Local: ${n.local} 
      <button class="btn-close btn-close-white btn-sm ms-1 desativar-notif-btn" data-type="local" data-value="${n.local}"></button></span>`;
    });

  container.innerHTML =
    html || '<p class="text-muted">Nenhuma notificação ativada.</p>';

  container.querySelectorAll(".desativar-notif-btn").forEach((btn) => {
    btn.onclick = function (e) {
      e.stopPropagation();
      desativarNotificacao(e.target.dataset.type, e.target.dataset.value);
    };
  });
}

function desativarNotificacao(type, value) {
  const u = usuarioLogado.username;

  if (type === "cat") {
    notificacoesCategorias = notificacoesCategorias.filter(
      (n) => !(n.categoria === value && n.usuario === u)
    );
  } else if (type === "local") {
    notificacoesLocais = notificacoesLocais.filter(
      (n) => !(n.local === value && n.usuario === u)
    );
  }

  salvarNotificacoesCriticas();
  renderizarNotificacoes();
  mostrarToast("Notificação desativada!", "info");
}

function salvarNotificacoesCriticas() {
  salvar("eco_notifCat", notificacoesCategorias);
  salvar("eco_notifLoc", notificacoesLocais);
  salvar("eco_notifRec", notificacoesRecebidas);
}

function carregarNotificacoesCriticas() {
  notificacoesCategorias = carregar("eco_notifCat");
  notificacoesLocais = carregar("eco_notifLoc");
  notificacoesRecebidas = carregar("eco_notifRec");
}

function salvarFavoritosStorage() {
  salvar("eco_favoritos", favoritos);
}

function carregarFavoritosStorage() {
  favoritos = carregar("eco_favoritos");
}

function salvarNegociacoesStorage() {
  salvar("eco_negociacoes", negociacoes);
}

function carregarNegociacoesStorage() {
  negociacoes = carregar("eco_negociacoes");
}

//10.0 Funções dos itens
function removerItemPorId(id) {
  if (!confirm("Tem certeza que deseja remover este anúncio?")) return;

  const item = itens.find((i) => i.id === id);
  if (!item || item.anuncianteUsername !== usuarioLogado.username) {
    mostrarToast("Você não tem permissão para remover este item.", "error");
    return;
  }

  item.lances?.forEach((l) =>
    adicionarNotificacao(
      l.usuario,
      "❌ Item Removido/Cancelado",
      `O item **${item.nome}** foi removido/cancelado pelo anunciante.`,
      item.id
    )
  );

  itens = itens.filter((i) => i.id !== id);
  salvarDadosCompletos();
  renderizarItens();
  mostrarToast("Anúncio removido com sucesso!", "success");

  const modalDetalhes = $("detalhes-item-modal");
  if (modalDetalhes) fecharModal(modalDetalhes);
}

//10.1 Favoritos
function isFavoritoParaUsuario(id, user) {
  return favoritos.some((f) => f.itemId === id && f.username === user);
}

function toggleFavorito(id) {
  if (!usuarioLogado) {
    mostrarToast("Faça login para favoritar.", "warning");
    return;
  }

  const u = usuarioLogado.username;
  const encontrou = favoritos.findIndex(
    (f) => f.itemId === id && f.username === u
  );

  if (encontrou !== -1) {
    favoritos.splice(encontrou, 1);
    mostrarToast("Removido dos favoritos!", "info");
  } else {
    favoritos.push({ itemId: id, username: u });
    mostrarToast("Adicionado aos favoritos!", "success");
  }

  salvarFavoritosStorage();
  renderizarItens();
}

//11.0 Temporizador
function formatarTempo(ms) {
  if (ms < 0) return "Tempo Esgotado";

  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;

  const partes = [];
  if (d) partes.push(`${d}d`);
  if (h || d) partes.push(`${h}h`);
  if (m || h || d) partes.push(`${m}m`);
  partes.push(`${seg}s`);

  return partes.slice(0, 3).join(" ");
}

function atualizarContadores() {
  const agora = Date.now();
  let expirou = false;

  //Verificar deleção a cada 60 segundos
  if (!window.ultimaVerificacaoDeletacao) window.ultimaVerificacaoDeletacao = 0;
  if (agora - window.ultimaVerificacaoDeletacao > 60000) {
    verificarItensParaDeletar();
    window.ultimaVerificacaoDeletacao = agora;
  }

  document.querySelectorAll(".timer").forEach((t) => {
    const id = +t.dataset.itemid;
    const item = itens.find((i) => i.id === id);
    if (!item) {
      t.textContent = "Item Removido";
      return;
    }

    const criado = new Date(t.dataset.criadoem).getTime();
    const expiraMs = +t.dataset.tempoexpiracao * 3.6e6;

    if (
      (item.negociado || item.cancelado || item.expirado) &&
      item.dataFinalizacao
    ) {
      const dataFim = new Date(item.dataFinalizacao).getTime();
      const tempoRestanteDel = dataFim + 24 * 3600000 - agora;

      if (tempoRestanteDel > 0) {
        t.textContent = `🗑️ Será removido em ${formatarTempo(
          tempoRestanteDel
        )}`;
        t.classList.add("text-danger");
      } else {
        t.textContent = "Removendo...";
      }
      return;
    }

    if (t.dataset.status === "ativo" && !item.negociado && !item.cancelado) {
      const resto = criado + expiraMs - agora;
      if (resto <= 0) {
        t.textContent = "⏰ Tempo Esgotado!";
        t.dataset.status = "expirado";
        t.classList.remove("text-danger", "fw-bold");
        item.expirado = true;
        expirou = true;

        if (item.anuncianteUsername && !item.notificadoExpiracao) {
          adicionarNotificacao(
            item.anuncianteUsername,
            `⏰ Tempo Expirado: ${item.nome}`,
            `O prazo para **${item.nome}** terminou. Escolha o vencedor ou marque como "Sem Acordo".`,
            item.id
          );
          item.notificadoExpiracao = true;
          marcarItemComoFinalizado(item);
        }
      } else {
        t.textContent = `⏱️ ${formatarTempo(resto)}`;
        if (item && isTempoCritico(item)) {
          t.classList.add("text-danger", "fw-bold");
        } else {
          t.classList.remove("text-danger", "fw-bold");
        }
      }
    } else if (item.expirado && !item.negociado && !item.cancelado) {
      t.textContent = "⏰ Tempo Esgotado!";
    } else {
      t.textContent = item.negociado ? "✅ Negociado" : "❌ Cancelado";
      t.classList.remove("text-danger", "fw-bold");
    }
  });

  if (expirou) {
    salvarDadosCompletos();
    if ($("home-screen")?.style.display === "block") renderizarItens();
  }
}

setInterval(atualizarContadores, 1000);

//12.0 Dados iniciais
function popularDadosIniciais() {
  //Só adicionar se não existirem usuários
  if (usuarios.length > 0) {
    console.log("✅ Usuários já existem, pulando inicialização");
    return;
  }

  console.log("🔧 Populando dados iniciais...");

  const usuariosIniciais = [
    {
      username: "marcos@mail.com",
      senha: "123",
      nome: "Marcos",
      sobrenome: "Silva",
      email: "marcos@mail.com",
      telefone: "9999-1111",
      endereco: "Rua A, 100, Niterói",
      imagem: "https://via.placeholder.com/150/0000FF/FFFFFF?text=MS",
      reputacao: "4.5",
      avaliacoesRecebidas: [{ estrelas: 5 }, { estrelas: 4 }],
      avaliacoesPendentes: [],
      pontosEco: 120,
      cupons: [],
    },
    {
      username: "maria@mail.com",
      senha: "123",
      nome: "Maria",
      sobrenome: "Souza",
      email: "maria@mail.com",
      telefone: "9999-2222",
      endereco: "Av. B, 200, Rio de Janeiro",
      imagem: "https://via.placeholder.com/150/FF0000/FFFFFF?text=MSZ",
      reputacao: "N/A",
      avaliacoesRecebidas: [],
      avaliacoesPendentes: [],
      pontosEco: 50,
      cupons: [],
    },
    {
      username: "empresa@mail.com",
      senha: "123",
      nome: "EcoReciclagem",
      sobrenome: "RJ",
      email: "empresa@mail.com",
      telefone: "8888-3333",
      endereco: "Av. Industrial, 50, Duque de Caxias",
      imagem: "https://via.placeholder.com/150/00FF00/000000?text=ER",
      reputacao: "5.0",
      avaliacoesRecebidas: [{ estrelas: 5 }],
      avaliacoesPendentes: [],
      pontosEco: 250,
      cupons: [],
    },
  ];

  usuarios.push(...usuariosIniciais);

  const itensIniciais = [
    {
      categoria: "Móveis",
      nome: "Berço de madeira",
      descricao: "Berço em bom estado, Retirada no Rio de Janeiro.",
      localidade: "Rio de Janeiro",
      tempoExpiracao: 2,
      quantidade: 1,
      imagem: "img/berco.jpg",
      imagens: ["img/berco.jpg"],
    },
    {
      categoria: "Sucata",
      nome: "Peças de metal",
      descricao: "Cerca de 20kg de sucata de metal, perfeito para reciclagem.",
      localidade: "Rio de Janeiro",
      tempoExpiracao: 0.0083,
      quantidade: 20,
      imagem: "img/sucata.jpg",
      imagens: ["img/sucata.jpg"],
    },
    {
      categoria: "Eletrônicos",
      nome: "Monitor antigo",
      descricao: "Monitor antigo, precisa de conserto ou descarte adequado.",
      localidade: "São Gonçalo",
      tempoExpiracao: 1,
      quantidade: 1,
      imagem: "img/monitor.jpg",
      imagens: ["img/monitor.jpg"],
    },
  ];

  const marcos = obterUsuarioPorUsername("marcos@mail.com");
  const maria = obterUsuarioPorUsername("maria@mail.com");
  const agora = Date.now();

  itensIniciais.forEach((itemInicial, idx) => {
    const anunciante = idx === 1 ? maria : marcos;
    const novoItem = {
      ...itemInicial,
      id: ++_ultimoId,
      anunciante: `${anunciante.nome} ${anunciante.sobrenome}`,
      anuncianteUsername: anunciante.username,
      lances:
        idx === 0
          ? [
              {
                usuario: "maria@mail.com",
                tipo: "gratuito",
                valor: 0,
                quantidade: 1,
                data: new Date(agora - 10000).toISOString(),
              },
              {
                usuario: "empresa@mail.com",
                tipo: "pago",
                valor: 50,
                quantidade: 1,
                data: new Date(agora - 5000).toISOString(),
              },
            ]
          : [],
      perguntas: [],
      status: "ativo",
      criadoEm: new Date(
        idx === 1 ? agora - 0.083 * 3600000 : agora - 3600000
      ).toISOString(),
      negociado: false,
      expirado: false,
      cancelado: false,
    };

    itens.push(novoItem);
  });

  salvarDadosCompletos();
  console.log("✅ Dados iniciais criados!");
}

//13.0 Inicialização
function init() {
  console.log("🚀 Iniciando aplicação...");

  carregarDadosCompletos();
  carregarFavoritosStorage();
  carregarNegociacoesStorage();
  carregarNotificacoesCriticas();

  popularDadosIniciais();

  garantirIdsUnicos();
  carregarCategorias();
  carregarLocalidades();

  const logged = localStorage.getItem("eco_usuarioLogado");
  if (logged) {
    usuarioLogado = obterUsuarioPorUsername(logged);
    console.log("✅ Usuário logado:", usuarioLogado?.nome);
  }

  if (usuarioLogado) {
    renderizarHome();
    atualizarContadorNotificacoes();
    atualizarContadorNegociacoes();
  } else {
    renderizarLogin();
  }

  renderizarNotificacoes();
  mostrarBannerCookies();
  inicializarSistemaEstrelas();

  document
    .querySelectorAll(".modal")
    .forEach((modal) => tornarModalArrastavel(modal));

  console.log("✅ Aplicação iniciada com sucesso!");
}

//14.0 Cookies
function mostrarBannerCookies() {
  const aceitos = localStorage.getItem("eco_cookies_aceitos");
  if (aceitos === "true") {
    cookiesAceitos = true;
    return;
  }

  const banner = $("cookie-banner");
  if (banner) {
    banner.classList.add("show");
    banner.style.display = "block";
  }
}

function aceitarCookies() {
  localStorage.setItem("eco_cookies_aceitos", "true");
  cookiesAceitos = true;
  const banner = $("cookie-banner");
  if (banner) {
    banner.classList.remove("show");
    banner.style.display = "none";
  }
  mostrarToast("Cookies aceitos! Obrigado.", "success");
}

function recusarCookies() {
  localStorage.setItem("eco_cookies_aceitos", "false");
  const banner = $("cookie-banner");
  if (banner) {
    banner.classList.remove("show");
    banner.style.display = "none";
  }
  mostrarToast(
    "Algumas funcionalidades podem não funcionar corretamente sem cookies.",
    "warning"
  );
}

//Funções do perfil
function mudarSenha() {
  if (!usuarioLogado) return;
  const modal = $("modal-mudar-senha");
  if (modal) abrirModal(modal);
}

function deletarConta() {
  if (!usuarioLogado) return;

  if (
    !confirm(
      "⚠️ ATENÇÃO: Esta ação é PERMANENTE e irá deletar todos os seus dados, incluindo anúncios, lances e histórico. Deseja realmente continuar?"
    )
  )
    return;

  const senhaConfirmacao = prompt("Digite sua senha para confirmar:");
  if (senhaConfirmacao !== usuarioLogado.senha) {
    mostrarToast("Senha incorreta. Conta não foi deletada.", "error");
    return;
  }

  const username = usuarioLogado.username;

  usuarios = usuarios.filter((u) => u.username !== username);
  itens = itens.filter((i) => i.anuncianteUsername !== username);
  favoritos = favoritos.filter((f) => f.username !== username);
  notificacoesRecebidas = notificacoesRecebidas.filter(
    (n) => n.usuario !== username
  );
  notificacoesCategorias = notificacoesCategorias.filter(
    (n) => n.usuario !== username
  );
  notificacoesLocais = notificacoesLocais.filter((n) => n.usuario !== username);

  itens.forEach((item) => {
    item.lances = item.lances?.filter((l) => l.usuario !== username) || [];
  });

  salvarDadosCompletos();
  salvarFavoritosStorage();
  salvarNotificacoesCriticas();
  salvarNegociacoesStorage();

  usuarioLogado = null;
  localStorage.removeItem("eco_usuarioLogado");

  mostrarToast("Sua conta foi deletada permanentemente. Até logo!", "info");
  renderizarLogin();
}

function recuperarSenha() {
  const email = $("email-recuperacao")?.value;

  if (!email) {
    mostrarToast("Digite seu email.", "warning");
    return;
  }

  const user = obterUsuarioPorUsername(email);

  if (!user) {
    mostrarToast("Email não encontrado em nossa base de dados.", "error");
    return;
  }

  mostrarToast(
    `Um email de recuperação foi enviado para ${email}.\n\n(Simulação: Sua senha é "${user.senha}")`,
    "info"
  );

  const modal = $("modal-esqueci-senha");
  if (modal) fecharModal(modal);
}

function registrarNegociacao(dados) {
  negociacoes.push(dados);
  salvarNegociacoesStorage();
}

function mostrarHistoricoNegociacoes() {
  if (!usuarioLogado) {
    mostrarToast("Faça login para ver o histórico.", "warning");
    return;
  }

  const list = $("negociacoes-list");
  if (!list) return;

  list.innerHTML = "";

  const rel = negociacoes
    .filter((n) => {
      if (n.tipo === "aceito") {
        const participa =
          n.anunciante === usuarioLogado.username ||
          n.vencedor === usuarioLogado.username;
        if (participa && !n.lida) n.lida = true;
        return participa;
      }
      return false;
    })
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  salvarNegociacoesStorage();
  atualizarContadorNegociacoes();

  if (!rel.length) {
    list.innerHTML =
      '<li class="list-group-item text-muted">Nenhuma negociação encontrada.</li>';
  } else {
    rel.forEach((n) => {
      const data = new Date(n.data).toLocaleString();
      list.innerHTML += `
        <li class="list-group-item">
          <div class="fw-bold">✅ ${n.itemNome} — Negociação Concluída</div>
          <small>Anunciante: ${n.anunciante} | Vencedor: ${n.vencedor} | ${data}</small>
        </li>
      `;
    });
  }
}

//15.0 Eventos DOM
document.addEventListener("DOMContentLoaded", function () {
  init();

  const lanceModalEl = $("lance-modal");
  const lancesAnuncianteModalEl = $("lances-anunciante-modal");

  if (lanceModalEl) {
    lanceModalInstance = new bootstrap.Modal(lanceModalEl, {
      backdrop: "static",
      keyboard: false,
    });
  }

  if (lancesAnuncianteModalEl) {
    lancesAnuncianteModalInstance = new bootstrap.Modal(
      lancesAnuncianteModalEl,
      { backdrop: "static", keyboard: false }
    );
  }

  // Evento para mudança no tipo de lance
  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "tipo-lance-select") {
      const valorContainer = $("lance-valor-container");
      const valorInput = $("valor-lance-input");
      if (valorContainer) {
        valorContainer.style.display =
          e.target.value === "gratuito" ? "none" : "block";
        if (e.target.value === "gratuito" && valorInput)
          valorInput.value = "0.00";
      }
    }
  });

  // Eventos de clique
  document.addEventListener("click", function (e) {
    // Confirmar lance
    if (e.target && e.target.id === "confirmar-lance-btn") {
      e.preventDefault();
      e.stopPropagation();

      if (!itemAtualLance || !usuarioLogado) {
        mostrarToast("Erro: item ou usuário não identificado.", "error");
        return;
      }

      const tipoSelect = $("tipo-lance-select");
      const valorInput = $("valor-lance-input");
      const qtdInput = $("quantidade-lance-input");
      const transporteSelect = $("lance-transporte-eco");

      if (!tipoSelect || !qtdInput) {
        mostrarToast("Erro ao processar lance.", "error");
        return;
      }

      const tipo = tipoSelect.value;
      const valor =
        tipo === "gratuito"
          ? 0
          : parseFloat(valorInput ? valorInput.value.replace(",", ".") : "0") ||
            0;
      const qtd = parseInt(qtdInput.value) || 1;
      const transporteEco = transporteSelect ? transporteSelect.value : "";

      if (tipo !== "gratuito" && (isNaN(valor) || valor <= 0)) {
        mostrarToast("Insira um valor válido maior que zero.", "warning");
        return;
      }

      if (qtd < 1 || qtd > itemAtualLance.quantidade) {
        mostrarToast(
          `Quantidade entre 1 e ${itemAtualLance.quantidade}`,
          "warning"
        );
        return;
      }

      const lanceExistente = itemAtualLance.lances?.find(
        (l) => l.usuario === usuarioLogado.username
      );

      if (lanceExistente) {
        lanceExistente.tipo = tipo;
        lanceExistente.valor = valor;
        lanceExistente.quantidade = qtd;
        lanceExistente.transporteEco = transporteEco;
        lanceExistente.data = new Date().toISOString();
      } else {
        if (!itemAtualLance.lances) itemAtualLance.lances = [];
        itemAtualLance.lances.push({
          usuario: usuarioLogado.username,
          tipo,
          valor,
          quantidade: qtd,
          transporteEco,
          data: new Date().toISOString(),
        });
      }

      const valTxt =
        tipo === "gratuito"
          ? "retirada gratuita"
          : tipo === "pago"
          ? `R$ ${valor.toFixed(2)} (Paga)`
          : `R$ ${valor.toFixed(2)} (Cobra)`;

      adicionarNotificacao(
        itemAtualLance.anuncianteUsername,
        "💰 Novo Lance!",
        `${usuarioLogado.nome} deu lance de ${valTxt}`,
        itemAtualLance.id
      );

      salvarDadosCompletos();
      renderizarItens();
      mostrarToast("Lance registrado com sucesso!", "success");
      if (lanceModalInstance) lanceModalInstance.hide();

      return false;
    }

    //Remover lance
    if (e.target && e.target.id === "remover-lance-btn") {
      e.preventDefault();
      e.stopPropagation();

      if (!itemAtualLance || !usuarioLogado) {
        mostrarToast("Você precisa estar logado.", "warning");
        return;
      }

      if (!confirm("Remover seu lance?")) return;

      const antes = itemAtualLance.lances?.length || 0;
      itemAtualLance.lances =
        itemAtualLance.lances?.filter(
          (l) => l.usuario !== usuarioLogado.username
        ) || [];

      if (itemAtualLance.lances.length < antes) {
        salvarDadosCompletos();
        renderizarItens();
        mostrarToast("Lance removido com sucesso!", "success");
        if (lanceModalInstance) lanceModalInstance.hide();
      } else {
        mostrarToast("Você não possui lances neste item.", "info");
      }

      return false;
    }

    //Resgatar cupom
    if (e.target.classList.contains("btn-resgatar-cupom")) {
      e.preventDefault();
      e.stopPropagation();

      const pontosCusto = parseInt(e.target.dataset.pontos);
      const dadosCupom = {};
      if (e.target.dataset.desconto)
        dadosCupom.desconto = parseInt(e.target.dataset.desconto);
      else dadosCupom.valor = parseInt(e.target.dataset.valor);
      resgatarCupom(pontosCusto, dadosCupom);

      return false;
    }
  });

  //Eventos de teclado
  document.addEventListener("keypress", function (e) {
    //Enviar mensagem no chat
    if (
      e.target &&
      e.target.id === "chat-mensagem-input" &&
      e.key === "Enter"
    ) {
      e.preventDefault();
      enviarMensagemChat();
    }

    //Enviar pergunta
    if (e.target && e.target.id === "input-pergunta" && e.key === "Enter") {
      e.preventDefault();
      if (itemDetalhesAtual) enviarPergunta(itemDetalhesAtual.id);
    }
  });

  //Função para enviar mensagem no chat
  function enviarMensagemChat() {
    const inputMsg = $("chat-mensagem-input");
    const chatContainer = $("chat-mensagens");
    if (!inputMsg || !chatContainer) return;

    const texto = inputMsg.value.trim();
    if (!texto) {
      mostrarToast("Digite uma mensagem.", "warning");
      return;
    }

    const conversaId = chatContainer.dataset.conversaId;
    if (!conversaId) {
      mostrarToast("Erro ao identificar conversa.", "error");
      return;
    }

    const conversaMsgs = mensagens.filter((m) => m.conversaId === conversaId);
    if (!conversaMsgs.length) return;

    const outroUsuario =
      conversaMsgs[0].de === usuarioLogado.username
        ? conversaMsgs[0].para
        : conversaMsgs[0].de;

    mensagens.push({
      id: `${conversaId}_${Date.now()}`,
      conversaId,
      itemId: conversaMsgs[0].itemId,
      itemNome: conversaMsgs[0].itemNome,
      de: usuarioLogado.username,
      para: outroUsuario,
      texto,
      data: new Date().toISOString(),
      lida: false,
    });

    salvarDadosCompletos();
    inputMsg.value = "";
    abrirConversa(conversaId);
    mostrarToast("Mensagem enviada!", "success");
  }

  //Botão adicionar item
  const addBtn = $("add-item-btn");
  if (addBtn) {
    addBtn.onclick = () => {
      if (usuarioLogado) {
        mostrarTela($("add-item-screen"));
      } else {
        mostrarToast("Faça login primeiro.", "warning");
        mostrarTela($("login-screen"));
      }
    };
  }

  //Botão voltar do cadastro
  const voltarCadastro = $("voltar-home-cadastro");
  if (voltarCadastro) voltarCadastro.onclick = renderizarHome;

  //Form de login
  const loginF = $("login-form");
  if (loginF) {
    loginF.onsubmit = function (e) {
      e.preventDefault();
      const user = obterUsuarioPorUsername($("login-username").value);
      if (!user || user.senha !== $("login-password").value) {
        mostrarToast("Usuário ou senha inválidos.", "error");
        return;
      }
      usuarioLogado = user;
      localStorage.setItem("eco_usuarioLogado", user.username);
      renderizarHome();
      atualizarContadorNotificacoes();
      atualizarContadorNegociacoes();
      mostrarToast(`Bem-vindo de volta, ${user.nome}!`, "success");
    };
  }

  //Links de navegação
  const toReg = $("to-register");
  if (toReg)
    toReg.onclick = (e) => {
      e.preventDefault();
      mostrarTela($("register-screen"));
    };

  const toLog = $("to-login");
  if (toLog)
    toLog.onclick = (e) => {
      e.preventDefault();
      mostrarTela($("login-screen"));
    };

  //Form de registro
  const regForm = $("register-form");
  if (regForm) {
    regForm.onsubmit = function (e) {
      e.preventDefault();
      const email = $("reg-email").value;

      if (usuarios.find((u) => u.username === email)) {
        mostrarToast("Email já cadastrado.", "warning");
        return;
      }

      const enderecoCompleto = enderecoRua
        ? `${enderecoRua}, ${cidade}`
        : cidade;

      usuarios.push({
        username: email,
        senha: $("reg-senha").value,
        nome: $("reg-nome").value,
        sobrenome: $("reg-sobrenome").value,
        email,
        telefone: $("reg-telefone").value,
        endereco: enderecoCompleto,
        imagem: "https://via.placeholder.com/150",
        reputacao: "N/A",
        avaliacoesRecebidas: [],
        avaliacoesPendentes: [],
        pontosEco: 0,
        cupons: [],
      });

      salvarDadosCompletos();
      mostrarToast("Cadastro realizado com sucesso! Faça login.", "success");
      mostrarTela($("login-screen"));
    };
  }

  //Botão logout
  const logoutB = $("logout-btn");
  if (logoutB) {
    logoutB.onclick = () => {
      usuarioLogado = null;
      localStorage.removeItem("eco_usuarioLogado");
      renderizarLogin();
      mostrarToast("Logout realizado com sucesso!", "info");
    };
  }

  //Botão perfil
  const perfilB = $("perfil-btn");
  if (perfilB) perfilB.onclick = mostrarPerfil;

  //Botão voltar ao home
  const voltarH = $("voltar-home");
  if (voltarH) voltarH.onclick = renderizarHome;

  //Form de perfil
  const perfilF = $("perfil-form");
  if (perfilF) {
    perfilF.onsubmit = function (e) {
      e.preventDefault();
      if (!usuarioLogado) return;

      usuarioLogado.nome = $("perfil-nome-input").value;
      usuarioLogado.sobrenome = $("perfil-sobrenome-input").value;
      usuarioLogado.telefone = $("perfil-telefone-input").value;
      usuarioLogado.endereco = $("perfil-endereco-input").value;

      usuarios = usuarios.map((u) =>
        u.username === usuarioLogado.username ? usuarioLogado : u
      );
      salvarDadosCompletos();
      atualizarInfoNavBar();
      mostrarToast("Perfil atualizado com sucesso!", "success");
      mostrarPerfil();
    };
  }

  //Botão atualizar foto
  const fotoBtn = $("perfil-atualizar-foto");
  if (fotoBtn) {
    fotoBtn.onclick = function () {
      if (!usuarioLogado) {
        mostrarToast("Faça login.", "warning");
        return;
      }

      const file = $("perfil-upload")?.files[0];
      if (!file) {
        mostrarToast("Selecione uma imagem primeiro.", "warning");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        usuarioLogado.imagem = ev.target.result;
        $("perfil-imagem").src = ev.target.result;
        atualizarInfoNavBar();
        usuarios = usuarios.map((u) =>
          u.username === usuarioLogado.username ? usuarioLogado : u
        );
        salvarDadosCompletos();
        mostrarToast("Foto atualizada com sucesso!", "success");
      };
      reader.readAsDataURL(file);
    };
  }

  //Form adicionar item
  const addForm = $("add-item-form");
  if (addForm) {
    addForm.onsubmit = function (e) {
      e.preventDefault();
      if (!usuarioLogado) {
        mostrarToast("Faça login para adicionar itens.", "warning");
        return;
      }

      const nome = $("item-nome").value.trim();
      const descricao = $("item-descricao").value.trim();
      const quantidade = parseInt($("item-quantidade").value);
      const localidade = $("item-local").value;
      const categoria = $("item-categoria").value;
      const tempoExpiracao = parseFloat($("item-tempo").value);
      const imagensFiles = $("item-imagens").files;

      //Validações
      if (!imagensFiles.length) {
        mostrarToast("Selecione pelo menos uma imagem.", "warning");
        return;
      }

      if (imagensFiles.length > 5) {
        mostrarToast("Máximo de 5 imagens permitidas.", "warning");
        return;
      }

      //Verificar tamanho das imagens
      for (let file of imagensFiles) {
        if (file.size > 5 * 1024 * 1024) {
          mostrarToast(
            `Imagem "${file.name}" muito grande. Máximo: 5MB por imagem.`,
            "warning"
          );
          return;
        }
      }

      if (
        itens.find(
          (i) =>
            i.anuncianteUsername === usuarioLogado.username &&
            i.nome.toLowerCase() === nome.toLowerCase() &&
            i.categoria === categoria &&
            i.localidade === localidade &&
            !i.negociado &&
            !i.cancelado &&
            !i.expirado
        )
      ) {
        mostrarToast(`Você já tem um anúncio ativo de "${nome}"`, "warning");
        return;
      }

      //Comprimir todas as imagens antes de salvar
      console.log("🔄 Comprimindo imagens...");
      const promises = Array.from(imagensFiles).map((file) =>
        comprimirImagem(file, 800, 0.7)
      );

      Promise.all(promises)
        .then((imagensBase64) => {
          const novo = {
            id: ++_ultimoId,
            categoria,
            nome,
            descricao,
            localidade,
            tempoExpiracao,
            quantidade,
            imagem: imagensBase64[0],
            imagens: imagensBase64,
            lances: [],
            perguntas: [],
            status: "ativo",
            criadoEm: new Date().toISOString(),
            anunciante: `${usuarioLogado.nome} ${usuarioLogado.sobrenome}`,
            anuncianteUsername: usuarioLogado.username,
            negociado: false,
            expirado: false,
            cancelado: false,
          };

          itens.unshift(novo);

          if (salvarDadosCompletos()) {
            renderizarItens();
            addForm.reset();
            mostrarToast(`Item "${nome}" adicionado com sucesso!`, "success");
            mostrarTela($("home-screen"));

            // Notificar usuários interessados
            notificacoesCategorias
              .filter(
                (n) =>
                  n.categoria === categoria &&
                  n.usuario !== usuarioLogado.username
              )
              .forEach((n) =>
                adicionarNotificacao(
                  n.usuario,
                  `🔔 Novo em ${categoria}`,
                  `Item: ${nome}`,
                  novo.id
                )
              );

            notificacoesLocais
              .filter(
                (n) =>
                  n.local === localidade && n.usuario !== usuarioLogado.username
              )
              .forEach((n) =>
                adicionarNotificacao(
                  n.usuario,
                  `🔔 Novo em ${localidade}`,
                  `Item: ${nome}`,
                  novo.id
                )
              );
          } else {
            mostrarToast(
              "Erro ao salvar. Use menos imagens ou imagens menores.",
              "error"
            );
            _ultimoId--;
          }
        })
        .catch((erro) => {
          console.error("Erro ao processar imagens:", erro);
          mostrarToast("Erro ao processar imagens. Tente novamente.", "error");
        });
    };
  }

  //Filtros de busca
  [$("filter-category"), $("filter-local"), $("filter-text")].forEach((el) => {
    if (el) el.addEventListener("input", renderizarItens);
  });

  [
    "filter-raio",
    "filter-anuncio",
    "filter-reputacao",
    "filter-status",
  ].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", renderizarItens);
  });

  //Botão favoritos
  const favBtn = $("filter-favoritos");
  if (favBtn) {
    favBtn.onclick = () => {
      mostrarFavoritos = !mostrarFavoritos;
      favBtn.classList.toggle("btn-warning", mostrarFavoritos);
      favBtn.classList.toggle("btn-secondary", !mostrarFavoritos);
      renderizarItens();
      mostrarToast(
        mostrarFavoritos
          ? "Mostrando apenas favoritos"
          : "Mostrando todos os itens",
        "info"
      );
    };
  }

  //Botão limpar filtros
  const clearBtn = $("clear-filter");
  if (clearBtn) {
    clearBtn.onclick = () => {
      if ($("filter-category")) $("filter-category").value = "Todas";
      if ($("filter-local")) $("filter-local").value = "Todas";
      if ($("filter-text")) $("filter-text").value = "";
      if ($("filter-raio")) $("filter-raio").value = "0";
      if ($("filter-reputacao")) $("filter-reputacao").value = "0";
      if ($("filter-anuncio")) $("filter-anuncio").value = "recentes";
      if ($("filter-status")) $("filter-status").value = "todos";
      mostrarFavoritos = false;
      if (favBtn) favBtn.className = "btn btn-secondary btn-sm";
      renderizarItens();
      mostrarToast("Filtros limpos!", "info");
    };
  }

  //Botões de notificações
  const notifB = $("notif-btn");
  if (notifB) notifB.onclick = mostrarHistoricoNotificacoes;

  const limparN = $("limpar-notif-btn");
  if (limparN) limparN.onclick = limparNotificacoes;

  const openNotifCfg = $("open-notif-config-btn");
  if (openNotifCfg) openNotifCfg.onclick = renderizarNotificacoes;

  const negocBtn = $("negociacoes-btn");
  if (negocBtn) negocBtn.onclick = mostrarHistoricoNegociacoes;

  const conversasBtn = $("conversas-btn");
  if (conversasBtn) {
    conversasBtn.onclick = () => {
      mostrarConversas();
      abrirModal($("conversas-modal"));
    };
  }

  //Ativar notificações
  const ativarNotif = $("notif-ativar");
  if (ativarNotif) {
    ativarNotif.onclick = () => {
      if (!usuarioLogado) {
        mostrarToast("Faça login para ativar notificações.", "warning");
        return;
      }

      const cat = $("notif-categoria").value;
      const local = $("notif-local").value;

      if (!cat && !local) {
        mostrarToast("Selecione categoria e/ou localidade.", "warning");
        return;
      }

      let adicionado = false;

      if (
        cat &&
        cat !== "Todas Categorias" &&
        !notificacoesCategorias.find(
          (n) => n.categoria === cat && n.usuario === usuarioLogado.username
        )
      ) {
        notificacoesCategorias.push({
          categoria: cat,
          usuario: usuarioLogado.username,
        });
        adicionado = true;
      }

      if (
        local &&
        local !== "Todas Localidades" &&
        !notificacoesLocais.find(
          (n) => n.local === local && n.usuario === usuarioLogado.username
        )
      ) {
        notificacoesLocais.push({ local, usuario: usuarioLogado.username });
        adicionado = true;
      }

      if (adicionado) {
        salvarNotificacoesCriticas();
        renderizarNotificacoes();
        mostrarToast("Notificação ativada com sucesso!", "success");
      } else {
        mostrarToast("Notificação já está ativa.", "info");
      }
    };
  }

  //Botão recusar tudo
  const recusarT = $("recusar-tudo-btn");
  if (recusarT) {
    recusarT.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      marcarSemAcordo();
      return false;
    };
  }

  //Form de avaliação
  const avalForm = $("avaliacao-form");
  if (avalForm) {
    avalForm.onsubmit = function (e) {
      e.preventDefault();
      const avaliado = $("avaliacao-avaliado-username").value;
      const itemId = parseInt($("avaliacao-item-id").value);
      const estrelas = parseInt($("avaliacao-estrelas").value);
      const comentario = $("avaliacao-comentario").value;

      if (
        !usuarioLogado ||
        !avaliado ||
        !itemId ||
        estrelas < 1 ||
        estrelas > 5
      ) {
        mostrarToast("Preencha todos os campos corretamente.", "warning");
        return;
      }

      //Verificar se esta avaliação ainda está pendente
      const avaliacaoPendente = usuarioLogado.avaliacoesPendentes?.find(
        (p) => p.itemId === itemId && p.avaliado === avaliado
      );

      if (!avaliacaoPendente) {
        mostrarToast(
          "Avaliação não encontrada ou já foi realizada.",
          "warning"
        );
        return;
      }

      //Remover apenas a avaliação específica do usuário
      usuarioLogado.avaliacoesPendentes =
        usuarioLogado.avaliacoesPendentes.filter(
          (p) => !(p.itemId === itemId && p.avaliado === avaliado)
        );

      const u = obterUsuarioPorUsername(avaliado);
      if (!u) {
        mostrarToast("Usuário não encontrado.", "error");
        return;
      }

      if (!u.avaliacoesRecebidas) u.avaliacoesRecebidas = [];

      //Verificar se já avaliou
      const jaAvaliou = u.avaliacoesRecebidas.some(
        (a) => a.itemId === itemId && a.avaliador === usuarioLogado.username
      );

      if (jaAvaliou) {
        mostrarToast(
          "Você já avaliou este usuário para esta negociação.",
          "warning"
        );
        return;
      }

      //Adicionar a avaliação
      u.avaliacoesRecebidas.push({
        itemId,
        avaliador: usuarioLogado.username,
        estrelas,
        comentario,
        data: new Date().toISOString(),
      });

      //Recalcular reputação
      u.reputacao = (
        u.avaliacoesRecebidas.reduce((sum, a) => sum + a.estrelas, 0) /
        u.avaliacoesRecebidas.length
      ).toFixed(1);
      usuarios = usuarios.map((user) => {
        if (user.username === usuarioLogado.username) return usuarioLogado;
        if (user.username === avaliado) return u;
        return user;
      });

      salvarDadosCompletos();

      adicionarNotificacao(
        avaliado,
        "⭐ Nova Avaliação Recebida!",
        `${usuarioLogado.nome} avaliou você com ${estrelas} estrela${
          estrelas > 1 ? "s" : ""
        }.`,
        itemId
      );

      mostrarToast("Avaliação registrada com sucesso!", "success");
      fecharModal($("avaliacao-modal"));

      if ($("perfil-screen")?.style.display === "block") mostrarPerfil();
    };
  }

  //Cookies
  const aceitarCook = $("aceitar-cookies-btn");
  if (aceitarCook) aceitarCook.onclick = aceitarCookies;

  const recusarCook = $("recusar-cookies-btn");
  if (recusarCook) recusarCook.onclick = recusarCookies;

  const infoCook = $("info-cookies-btn");
  if (infoCook) {
    infoCook.onclick = (e) => {
      e.preventDefault();
      abrirModal($("modal-info-cookies"));
    };
  }

  //Botões do perfil
  const btnMudarSenha = $("btn-mudar-senha");
  if (btnMudarSenha) btnMudarSenha.onclick = mudarSenha;

  const formMudarSenha = $("form-mudar-senha");
  if (formMudarSenha) {
    formMudarSenha.onsubmit = function (e) {
      e.preventDefault();
      if (!usuarioLogado) return;

      if ($("senha-atual").value !== usuarioLogado.senha) {
        mostrarToast("Senha atual incorreta.", "error");
        return;
      }

      if ($("senha-nova").value !== $("senha-confirmar").value) {
        mostrarToast("As senhas não coincidem.", "warning");
        return;
      }

      if ($("senha-nova").value.length < 6) {
        mostrarToast("A senha deve ter pelo menos 6 caracteres.", "warning");
        return;
      }

      usuarioLogado.senha = $("senha-nova").value;
      salvarDadosCompletos();
      fecharModal($("modal-mudar-senha"));
      formMudarSenha.reset();
      mostrarToast("Senha alterada com sucesso!", "success");
    };
  }

  const btnDeletarConta = $("btn-deletar-conta");
  if (btnDeletarConta) btnDeletarConta.onclick = deletarConta;

  const btnVerCupons = $("btn-ver-cupons");
  if (btnVerCupons) btnVerCupons.onclick = mostrarCupons;

  const forgotPasswordLink = $("forgot-password-link");
  if (forgotPasswordLink) {
    forgotPasswordLink.onclick = (e) => {
      e.preventDefault();
      abrirModal($("modal-esqueci-senha"));
    };
  }

  const btnEnviarRecuperacao = $("btn-enviar-recuperacao");
  if (btnEnviarRecuperacao) btnEnviarRecuperacao.onclick = recuperarSenha;

  // Form editar item
  const formEditarItem = $("form-editar-item");
  if (formEditarItem) {
    formEditarItem.onsubmit = function (e) {
      e.preventDefault();
      const itemId = parseInt($("editar-item-id").value);
      const item = itens.find((i) => i.id === itemId);

      if (!item || item.anuncianteUsername !== usuarioLogado.username) {
        mostrarToast("Erro ao editar item.", "error");
        return;
      }

      item.nome = $("editar-item-nome").value.trim();
      item.descricao = $("editar-item-descricao").value.trim();

      const novasImagensInput = $("editar-item-novas-imagens");
      if (novasImagensInput?.files.length) {
        const imagensAtuais = item.imagens || [item.imagem];

        if (imagensAtuais.length + novasImagensInput.files.length > 5) {
          mostrarToast("Máximo de 5 imagens permitidas.", "warning");
          return;
        }

        const promises = Array.from(novasImagensInput.files).map((file) =>
          comprimirImagem(file, 800, 0.7)
        );

        Promise.all(promises).then((novasImagens) => {
          item.imagens = imagensAtuais.concat(novasImagens);
          item.imagem = item.imagens[0];
          salvarDadosCompletos();
          fecharModal($("modal-editar-item"));
          mostrarToast("Item atualizado com sucesso!", "success");
          renderizarItens();
        });
      } else {
        salvarDadosCompletos();
        fecharModal($("modal-editar-item"));
        mostrarToast("Item atualizado com sucesso!", "success");
        renderizarItens();
      }
    };
  }

  //Botão enviar pergunta
  const btnEnviarPergunta = $("btn-enviar-pergunta");
  if (btnEnviarPergunta) {
    btnEnviarPergunta.onclick = () => {
      if (itemDetalhesAtual) enviarPergunta(itemDetalhesAtual.id);
    };
  }

  //Botão enviar chat
  const btnEnviarChat = $("chat-enviar-btn");
  if (btnEnviarChat) {
    btnEnviarChat.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      enviarMensagemChat();
      return false;
    };
  }

  console.log("✅ Todos os event listeners configurados!");
});
