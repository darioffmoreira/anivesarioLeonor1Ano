(function () {
    const SITE_MODE_CONFIG = {
        // Turn this to true to force all pages into maintenance mode.
        enableMaintenanceMode: false,
        maintenancePagePath: "pages/manutencao.html"
    };

    window.SITE_MODE_CONFIG = SITE_MODE_CONFIG;

    function getCurrentFileInfo() {
        const cleanPath = window.location.pathname.replace(/\\/g, "/");
        const segments = cleanPath.split("/").filter(Boolean);
        const currentFileName = segments.length ? segments[segments.length - 1].toLowerCase() : "";
        const parentFolder = segments.length > 1 ? segments[segments.length - 2].toLowerCase() : "";

        return {
            currentFileName: currentFileName,
            isInsidePagesFolder: parentFolder === "pages"
        };
    }

    function resolveRelativePath(pathFromRoot, isInsidePagesFolder) {
        const normalized = String(pathFromRoot || "").replace(/^\/+/, "");

        if (!isInsidePagesFolder) {
            return normalized;
        }

        if (normalized.toLowerCase().indexOf("pages/") === 0) {
            return normalized.slice("pages/".length);
        }

        return normalized;
    }

    const fileInfo = getCurrentFileInfo();
    const isMaintenancePage = fileInfo.currentFileName === "manutencao.html";

    if (!SITE_MODE_CONFIG.enableMaintenanceMode || isMaintenancePage) {
        return;
    }

    const maintenanceTarget = resolveRelativePath(SITE_MODE_CONFIG.maintenancePagePath, fileInfo.isInsidePagesFolder);

    if (maintenanceTarget) {
        window.location.replace(maintenanceTarget);
    }
})();
