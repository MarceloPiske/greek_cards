/* NOTE Script do botão de marcar comcliudo */

function check() {
    const bt_check = document.getElementById("check")

    if (document.body.getAttribute("data-page")) {
        let page_id = document.body.getAttribute("data-page");
        
        if (!localStorage.getItem("check"+page_id) || localStorage.getItem("check"+page_id) == "false"){
            localStorage.setItem("check"+page_id, true)
        }else{
            localStorage.setItem("check"+page_id, false)
        }
        check_color()
    }
}
function check_color() {
    const bt_check = document.getElementById("check")

    if (document.body.getAttribute("data-page")) {
        let page_id = document.body.getAttribute("data-page");        
        if (!localStorage.getItem("check"+page_id) || localStorage.getItem("check"+page_id) == "false"){
            bt_check.classList.remove("success")
        }else{
            bt_check.classList.add("success")
        }
    }
}
check_color()

const themeSwitch = document.querySelector('#theme-toggle');
        const sunIcon = themeSwitch.querySelector('.sun');
        const moonIcon = themeSwitch.querySelector('.moon');
        let isDark = false;

        themeSwitch.addEventListener('click', () => {
            isDark = !isDark;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            sunIcon.style.display = isDark ? 'block' : 'none';
            moonIcon.style.display = isDark ? 'none' : 'block';
        });