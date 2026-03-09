function Footer() {
    return (
        <footer className="footer py-4  ">
            <div className="container-fluid">
                <div className="row align-items-center justify-content-lg-between">
                    <div className="col-lg-6 mb-lg-0 mb-4">
                        <div className="copyright text-center text-sm text-muted text-lg-start">
                           Built by Fernando
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <ul className="nav nav-footer justify-content-center justify-content-lg-end">
                            <li className="nav-item">
                                <a href="https://www.creative-tim.com" className="nav-link text-muted" target="_blank">Blog</a>
                            </li>
                            <li className="nav-item">
                                <a href="https://www.creative-tim.com/presentation" className="nav-link text-muted" target="_blank">Platform</a>
                            </li>
                            <li className="nav-item">
                                <a href="https://www.creative-tim.com/blog" className="nav-link text-muted" target="_blank">About</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    )
}
export default Footer;