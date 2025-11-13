import { motion } from "framer-motion";

export default function InfoPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 text-gray-900 p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <header className="mb-10">
        <h1 className="text-4xl font-bold">Neural Dynamics Explorer</h1>
        <p className="text-lg text-gray-600 mt-2">
          Interactive visualization and background information
        </p>
      </header>

      <main className="grid md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-semibold mb-3">About the Model</h2>
          <p className="text-base leading-relaxed">
            This neuron model was generated in Blender to illustrate complex
            dendritic branching patterns and synaptic topology. It demonstrates
            how neural connectivity influences signal integration.
          </p>
        </section>

        <section>
          <img
            src="/neuron_preview.png"
            alt="Neuron visualization"
            className="rounded-2xl shadow-lg"
          />
        </section>
      </main>
    </motion.div>
  );
}
