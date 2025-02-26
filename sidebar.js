document.addEventListener("DOMContentLoaded", function () {
  // 动态创建侧边栏的 HTML 结构
  function createSidebar() {
    const sidebar = document.createElement("div");
    sidebar.id = "sidebar";

    // Create heading level indicator
    const levelIndicator = document.createElement("div");
    levelIndicator.className = "heading-level-indicator";

    const sidebarContent = document.createElement("div");
    sidebarContent.className = "sidebar-content";

    const tocContainer = document.createElement("nav");
    tocContainer.id = "sidebar-toc";

    // Add tocContainer to sidebarContent
    sidebarContent.appendChild(tocContainer);

    // Add both levelIndicator and sidebarContent as siblings to sidebar
    sidebar.appendChild(levelIndicator);
    sidebar.appendChild(sidebarContent);

    const resizeHandle = document.createElement("div");
    resizeHandle.id = "sidebar-resize-handle";

    sidebar.appendChild(resizeHandle);

    document.body.appendChild(sidebar);

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "sidebar-toggle-btn";
    toggleBtn.textContent = "TOC";
    document.body.appendChild(toggleBtn);

    // 防止滚动传播
    sidebarContent.addEventListener(
      "wheel",
      (e) => {
        const scrollTop = sidebarContent.scrollTop;
        const scrollHeight = sidebarContent.scrollHeight;
        const height = sidebarContent.clientHeight;

        // 当滚动到顶部或底部时阻止事件传播
        if ((scrollTop <= 0 && e.deltaY < 0) || (scrollTop + height >= scrollHeight && e.deltaY > 0)) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    return { tocContainer, toggleBtn, sidebar, resizeHandle };
  }

  function isMobileView() {
    return window.matchMedia("(max-width: 768px)").matches;
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
  updateLevelIndicator(headings);

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

        // 尝试将当前active链接滚动到视图中间
        const sidebarContent = document.querySelector(".sidebar-content");
        if (sidebarContent) {
          const linkRect = currentLink.getBoundingClientRect();
          const sidebarRect = sidebarContent.getBoundingClientRect();

          // 定义中间区域范围（视口高度的40%-60%）
          const middleZoneStart = sidebarRect.height * 0.4;
          const middleZoneEnd = sidebarRect.height * 0.6;

          // 计算链接相对于侧边栏的位置
          const linkRelativeTop = linkRect.top - sidebarRect.top;

          // 只有当链接不在中间区域时才滚动
          if (linkRelativeTop < middleZoneStart || linkRelativeTop > middleZoneEnd) {
            // 计算目标滚动位置（让链接位于中间）
            const targetScroll = sidebarContent.scrollTop + (linkRelativeTop - sidebarRect.height / 2);

            // 使用平滑滚动效果
            sidebarContent.scrollTo({
              top: targetScroll,
              behavior: "smooth",
            });
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
      if (isMobileView()) {
        document.body.classList.add("sidebar-collapsed");
      }
    }
  });

  document.addEventListener("click", function (e) {
    if (isMobileView() && !document.body.classList.contains("sidebar-collapsed") && !sidebar.contains(e.target) && e.target !== toggleBtn) {
      document.body.classList.add("sidebar-collapsed");
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
    if (!isResizing || isMobileView()) return;

    // 使用 requestAnimationFrame 优化性能
    requestAnimationFrame(() => {
      // 将鼠标移动的像素距离转换为 rem
      const pixelsPerRem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      let newWidthRem = (startWidth + (e.clientX - startX)) / pixelsPerRem;

      // 限制最小宽度为 12rem (与 CSS 中的 --sidebar-width 默认值保持一致)
      if (newWidthRem < 12) {
        newWidthRem = 12;
      }

      sidebar.style.width = newWidthRem + "rem";
      // 同步 body 的 padding-left，加上 --padding-xy-box
      if (!document.body.classList.contains("sidebar-collapsed")) {
        document.body.style.paddingLeft = `calc(${newWidthRem}rem + var(--padding-xy-box))`;
      }
    });
  }

  function handleMouseUp(e) {
    if (!isResizing) return;
    isResizing = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  function updateLevelIndicator(headings) {
    const levelIndicator = document.querySelector(".heading-level-indicator");
    if (!levelIndicator) return;

    // Clear existing indicators
    levelIndicator.innerHTML = "";

    // Get unique heading levels
    const levels = new Set();
    headings.forEach((h) => {
      const level = parseInt(h.tagName.substring(1), 10);
      levels.add(level);
    });

    // Create indicator lines in order
    Array.from(levels)
      .sort((a, b) => a - b)
      .forEach((level) => {
        const line = document.createElement("div");
        line.className = "level-line";
        line.setAttribute("data-level", level);
        levelIndicator.appendChild(line);
      });
  }
});
