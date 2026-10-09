const h = 'font-semibold text-bijou-goldlight'

export function ScanGuide() {
  return (
    <details className="w-full max-w-md rounded-xl border border-white/30 bg-black/30 text-white text-left text-sm p-3">
      <summary className="cursor-pointer font-semibold">Guide de l'agent : cas compliqués</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p><span className={h}>Règle d'or.</span> Au moindre doute, appelle ton responsable. Ne décide jamais seul de faire entrer quelqu'un que l'écran refuse, et ne rescanne pas pour forcer.</p>
        <p><span className={h}>VALIDE (vert).</span> Compare le nom et la référence affichés avec le billet présenté. Billet sur téléphone : le bandeau doré doit défiler et l'heure changer chaque seconde. Billet imprimé : le logo BIJOU doit apparaître en filigrane. Si le nom ou la référence diffère, ne fais pas entrer et appelle ton responsable. Fais entrer le nombre de personnes indiqué, pas plus.</p>
        <p><span className={h}>DÉJÀ UTILISÉ (rouge).</span> Ne fais pas entrer d'office. Lis la date et l'heure de la première entrée. Demande à la personne de montrer son billet : un bandeau figé ou une heure qui ne bouge pas indique une capture d'écran, donc une copie. Reste calme, note la référence et appelle ton responsable, qui décide. Le premier billet scanné passe, même si c'était une copie : seul le responsable peut départager les deux personnes.</p>
        <p><span className={h}>BILLET REFUSÉ (rouge).</span> Billet expiré, annulé ou révoqué : pas d'entrée. Oriente la personne vers l'organisateur ou le point d'accueil.</p>
        <p><span className={h}>BILLET INCONNU (rouge).</span> QR abîmé, faux, ou d'un autre événement. Rescanne une seule fois, puis essaie la saisie manuelle du code. Si le résultat reste inconnu, refuse l'entrée et appelle ton responsable.</p>
        <p><span className={h}>VÉRIFICATION NÉCESSAIRE (orange).</span> Le serveur n'a pas répondu : le billet n'est ni validé ni refusé. Ne fais pas entrer sans vérification. Contrôle ta connexion, puis rescanne. Si ça ne passe toujours pas, appelle ton responsable.</p>
        <p><span className={h}>Bon à savoir.</span> Chaque billet ne passe qu'une seule fois. Les captures d'écran gardent le même QR, mais pas le bandeau animé, d'où l'importance de le vérifier.</p>
      </div>
    </details>
  )
}
