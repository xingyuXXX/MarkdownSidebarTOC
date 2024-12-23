document.addEventListener("DOMContentLoaded", function () {
  // 动态创建侧边栏的 HTML 结构
  function createSidebar() {
    const sidebar = document.createElement("div");
    sidebar.id = "sidebar";

    const sidebarContent = document.createElement("div");
    sidebarContent.className = "sidebar-content";

    const tocContainer = document.createElement("nav");
    tocContainer.id = "sidebar-toc";
    sidebarContent.appendChild(tocContainer);

    const resizeHandle = document.createElement("div");
    resizeHandle.id = "sidebar-resize-handle";

    sidebar.appendChild(sidebarContent);
    sidebar.appendChild(resizeHandle);

    document.body.appendChild(sidebar);

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "sidebar-toggle-btn";
    toggleBtn.textContent = "TOC";
    document.body.appendChild(toggleBtn);

    return { tocContainer, toggleBtn, sidebar, resizeHandle };
  }

  const { tocContainer, toggleBtn, sidebar, resizeHandle } = createSidebar();

  // 如果没有找到 #sidebar-toc 容器
  if (!tocContainer) {
    console.error("未找到 #sidebar-toc 容器，请确保JS中动态创建该元素。");
    return;
  }

  // 获取所有标题
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (headings.length === 0) {
    console.warn("未找到任何标题（h1~h6）。请确保HTML中有标题。");
  }

  /**
   * 如果标题没有id则生成一个
   */
  function setHeadingId(h) {
    if (!h.id) {
      const id = "heading-" + Math.random().toString(36).substr(2, 9);
      h.id = id;
    }
    return h.id;
  }

  /**
   * 构建目录树结构
   */
  function buildTOC(headings) {
    const root = document.createElement("ul");
    const stack = [{ level: 0, element: root }];

    headings.forEach((h) => {
      const level = parseInt(h.tagName.substring(1), 10);
      const li = document.createElement("li");
      li.setAttribute("data-level", level);

      const a = document.createElement("a");
      a.textContent = h.innerText;
      a.href = "#" + setHeadingId(h);
      a.title = h.innerText; // 鼠标悬停显示完整标题
      li.appendChild(a);

      while (stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      const parentLevel = stack[stack.length - 1].level;
      let parentUl = stack[stack.length - 1].element;

      if (level === parentLevel + 1) {
        // 正常增加一级层级
        if (level > 1) {
          let lastLi = parentUl.lastElementChild;
          if (!lastLi || lastLi.tagName.toLowerCase() !== "li") {
            parentUl.appendChild(li);
            stack.push({ level, element: parentUl });
          } else {
            let subUl = lastLi.querySelector("ul");
            if (!subUl) {
              subUl = document.createElement("ul");
              lastLi.appendChild(subUl);
            }
            subUl.appendChild(li);
            stack.push({ level, element: subUl });
          }
        } else {
          // h1直接挂在root下
          parentUl.appendChild(li);
          stack.push({ level, element: parentUl });
        }
      } else {
        // 跳级或同级直接添加
        parentUl.appendChild(li);
        stack.push({ level, element: parentUl });
      }
    });

    return root;
  }

  const toc = buildTOC(headings);
  tocContainer.appendChild(toc);

  // 记录每个标题的位置
  let headingPositions = [];
  function updateHeadingPositions() {
    headingPositions = headings.map((h) => {
      return {
        id: h.id,
        top: h.getBoundingClientRect().top + window.scrollY,
      };
    });
  }

  updateHeadingPositions();
  window.addEventListener("resize", updateHeadingPositions);

  /**
   * 高亮当前标题所在级别，并为该级别ul添加线条
   * 同时为上级标题添加.active-ancestor-lX类
   */
  function highlightCurrentHeading() {
    const scrollPos = window.scrollY + 10;
    // console.log("current scroll pos", window.scrollY);

    let current = null;
    updateHeadingPositions();
    for (let i = headingPositions.length - 1; i >= 0; i--) {
      if (headingPositions[i].top <= scrollPos) {
        current = headingPositions[i];
        break;
      }
    }

    const allLinks = tocContainer.querySelectorAll("a");
    const allUls = tocContainer.querySelectorAll("ul");
    const allLis = tocContainer.querySelectorAll("li");

    // 移除所有active和祖先标记
    allLinks.forEach((link) => link.classList.remove("active"));
    allUls.forEach((ul) => ul.classList.remove("active-siblings"));

    // 移除所有.active-ancestor-lX类
    // 假设最大到h6，如需支持更多可继续添加
    allLis.forEach((li) => {
      li.classList.remove("active-ancestor-l1", "active-ancestor-l2", "active-ancestor-l3", "active-ancestor-l4", "active-ancestor-l5", "active-ancestor-l6");
    });

    if (current) {
      const currentLink = tocContainer.querySelector('a[href="#' + current.id + '"]');
      if (currentLink) {
        currentLink.classList.add("active");
        let currentLi = currentLink.parentElement;
        let currentUl = currentLi.parentElement;
        if (currentUl && currentUl !== tocContainer) {
          currentUl.classList.add("active-siblings");
        }

        // 获取当前标题的level
        const childLevel = parseInt(currentLi.getAttribute("data-level"), 10);

        // 找到上一级标题的li并添加对应的ancestor类
        // 上一级标题li为 currentUl.parentElement（若存在）
        // currentUl是当前层级的ul，父级的li会在上一级ul之上
        if (currentUl && currentUl !== tocContainer) {
          let parentLi = currentUl.parentElement;
          if (parentLi && parentLi.tagName.toLowerCase() === "li") {
            // 对应childLevel的ancestor类，例如h3标题时添加active-ancestor-l3到父级h2的li
            parentLi.classList.add("active-ancestor-l" + childLevel);
          }
        }
      }
    }
  }

  window.addEventListener("scroll", highlightCurrentHeading);
  highlightCurrentHeading();

  tocContainer.addEventListener("click", function (e) {
    if (e.target.tagName.toLowerCase() === "a") {
      highlightCurrentHeading();
    }
  });

  // 切换侧边栏显隐
  toggleBtn.addEventListener("click", function () {
    document.body.classList.toggle("sidebar-collapsed");
  });

  /* 
    实现 sidebar 可拖拽改变宽度:
    - 在 #sidebar-resize-handle 上监听鼠标事件
    - 鼠标按下后，监听全局 mousemove 来动态调整sidebar宽度
    - 鼠标松开后停止监听
  */

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener("mousedown", function (e) {
    e.preventDefault();
    if (document.body.classList.contains("sidebar-collapsed")) {
      // 如果侧边栏收起了，就不允许拖拽
      return;
    }
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });

  function handleMouseMove(e) {
    if (!isResizing) return;
    let newWidth = startWidth + (e.clientX - startX);
    // 限制最小宽度
    if (newWidth < 150) {
      newWidth = 150;
    }
    sidebar.style.width = newWidth + "px";
    // 同步body的padding-left
    if (!document.body.classList.contains("sidebar-collapsed")) {
      document.body.style.paddingLeft = newWidth + "px";
    }
  }

  function handleMouseUp(e) {
    if (!isResizing) return;
    isResizing = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }
});
