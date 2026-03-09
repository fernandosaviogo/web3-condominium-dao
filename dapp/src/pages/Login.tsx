import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doLogin } from "../services/Web3Service";

function Login() {

  const navigate = useNavigate();

  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function btnLoginClick() {

    try {
      setMessage("");
      setIsLoading(true);

      await doLogin();

      navigate("/topics", { replace: true });

    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("Unexpected error during login");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="main-content mt-0">
      <div className="page-header align-items-start min-vh-100"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1700126689261-1f5bdfe5adcc?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8MHx8fA%3D%3D')" }}>

        <span className="mask bg-gradient-dark opacity-6"></span>

        <div className="container my-auto">
          <div className="row">
            <div className="col-lg-4 col-md-8 col-12 mx-auto">
              <div className="card z-index-0 fadeIn3 fadeInBottom">

                <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
                  <div className="bg-gradient-primary shadow-primary border-radius-lg py-3 pe-1">
                    <h4 className="text-white text-center mt-2 mb-0">
                      Condominium DAO
                    </h4>
                  </div>
                </div>

                <div className="card-body">

                  <div className="text-center">
                    <img src="/logo192.png" alt="Condominium logo" />
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      disabled={isLoading}
                      className="btn bg-gradient-primary w-100 my-4 mb-2"
                      onClick={btnLoginClick}
                    >
                      {isLoading ? "Connecting..." : (
                        <>
                          <img src="/assets/metamask.svg"
                            alt="MetaMask logo"
                            width="48"
                            className="me-2" />
                          Sign in with MetaMask
                        </>
                      )}
                    </button>
                  </div>

                  {message && (
                    <p className="mt-4 text-sm text-center text-danger">
                      {message}
                    </p>
                  )}

                  <p className="mt-4 text-sm text-center">
                    Don't have an account? Ask to the
                    <a
                      href="mailto:fernandosaviog@hotmail.com"
                      className="text-primary text-gradient font-weight-bold ms-2"
                    >
                      manager
                    </a>
                  </p>

                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}

export default Login;